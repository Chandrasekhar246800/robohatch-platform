import { Response } from 'express';
import { AuthRequest } from '../middlewares';
import { prisma } from '../config/prisma';
import { emailService } from '../services/email.service';
import { runPrusaSlicer } from '../services/prusaSlicer.service';
import { s3 } from '../config/s3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// Note: CustomDesignStatus will be available after running the migration
const CustomDesignStatus = {
  PENDING: 'PENDING',
  QUOTED: 'QUOTED',
  APPROVED: 'APPROVED',
  IN_PRODUCTION: 'IN_PRODUCTION',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;

/**
 * Download file from S3 to temporary location
 */
const downloadFromS3 = async (s3Key: string): Promise<string> => {
  const tempDir = process.env.UPLOAD_DIR || '/tmp/stl-uploads';
  await fs.promises.mkdir(tempDir, { recursive: true });

  const uniqueId = crypto.randomUUID();
  const ext = path.extname(s3Key);
  const tempPath = path.join(tempDir, `${uniqueId}${ext}`);

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
    });

    const response = await s3.send(command);
    const stream = response.Body as Readable;

    const writeStream = fs.createWriteStream(tempPath);
    await new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on('error', reject);
      writeStream.on('finish', () => resolve(undefined));
      writeStream.on('error', reject);
    });

    return tempPath;
  } catch (error: any) {
    console.error('Failed to download from S3:', error);
    throw new Error(`S3 download failed: ${error.message}`);
  }
};

/**
 * Extract S3 key from S3 URL/location
 */
const getS3KeyFromUrl = (s3Url: string): string => {
  // Handle different S3 URL formats:
  // https://bucket.s3.region.amazonaws.com/key
  // https://s3.region.amazonaws.com/bucket/key
  // or just the key itself if using multer-s3 key property
  
  if (s3Url.includes('amazonaws.com')) {
    const parts = s3Url.split('.amazonaws.com/');
    if (parts.length > 1) {
      return parts[1].split('?')[0]; // Remove query params
    }
  }
  
  // Assume it's already a key
  return s3Url.replace(/^https?:\/\/[^\/]+\//, '');
};

/**
 * Get material cost per gram for FDM materials
 */
const getMaterialCostPerGram = (material: string): number => {
  const costs: Record<string, number> = {
    pla: 4,     // PLA - ₹4 per gram
    abs: 7,     // ABS - ₹7 per gram
    petg: 6,    // PETG - ₹6 per gram
    tpu: 8,     // TPU - ₹8 per gram (most expensive, flexible)
  };
  return costs[material] || 4; // Default to PLA cost
};

export const createCustomDesign = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get uploaded file from multer-s3
    const file = req.file as Express.MulterS3.File;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '3D file upload is required',
      });
    }

    const {
      name,
      description,
      material,
      color,
      size,
      quantity,
      infillPercentage,
      layerHeight,
    } = req.body;

    if (!name || !material || !color) {
      return res.status(400).json({
        success: false,
        message: 'Name, material, and color are required',
      });
    }


    // Determine file extension and type
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const is3DFile = ['.stl', '.3mf', '.obj', '.gcode'].includes(fileExtension);
    const materialLower = material.toLowerCase();
    const quantityInt = parseInt(quantity) || 1;

    let estimatedPrice: number;
    let pricingData: {
      accurate: boolean;
      filament_grams?: number;
      model_weight_grams?: number;
      support_weight_grams?: number;
      tower_weight_grams?: number;
      purge_weight_grams?: number;
      extruder_count?: number;
      print_time_seconds?: number;
      final_price: number;
    } = {
      accurate: false,
      final_price: 0,
    };

    let tempFilePath: string | null = null;

    try {
      if (is3DFile && (fileExtension === '.stl' || fileExtension === '.3mf')) {
        console.log(`🔬 3D file detected (${fileExtension}) - starting PrusaSlicer analysis...`);
        
        // Step 1: Download file from S3 to temp location
        const s3Key = getS3KeyFromUrl(file.key || file.location);
        console.log(`📥 Downloading file from S3: ${s3Key}`);
        tempFilePath = await downloadFromS3(s3Key);
        console.log(`✓ Downloaded to: ${tempFilePath}`);

        const pricePerGram = getMaterialCostPerGram(materialLower);

        // Step 2: Run PrusaSlicer (ONLY method - no fallback)
        console.log(`🔧 Running PrusaSlicer analysis...`);
        const slicerResult = await runPrusaSlicer(tempFilePath) as any;
        
        const weightGrams = Math.round(slicerResult.totalWeight);
        const rawCost = Math.round(weightGrams * pricePerGram);
        estimatedPrice = rawCost * quantityInt;

        // Parse print time string to seconds
        let printTimeSeconds: number | undefined = undefined;
        if (slicerResult.printTime) {
          const timeStr = slicerResult.printTime;
          let seconds = 0;
          const hours = timeStr.match(/(\d+)h/);
          const minutes = timeStr.match(/(\d+)m/);
          if (hours) seconds += parseInt(hours[1]) * 3600;
          if (minutes) seconds += parseInt(minutes[1]) * 60;
          printTimeSeconds = seconds;
        }
        
        pricingData = {
          accurate: true,
          filament_grams: weightGrams,
          model_weight_grams: Math.round(slicerResult.modelWeight * 100) / 100,
          support_weight_grams: Math.round(slicerResult.supportWeight * 100) / 100,
          tower_weight_grams: Math.round(slicerResult.towerWeight * 100) / 100,
          purge_weight_grams: Math.round(slicerResult.purgeWeight * 100) / 100,
          extruder_count: slicerResult.extruderCount || 1,
          print_time_seconds: printTimeSeconds,
          final_price: estimatedPrice,
        };
        
        console.log(`✅ PrusaSlicer analysis complete:`);
        console.log(`   Model weight: ${slicerResult.modelWeight}g`);
        console.log(`   Support weight: ${slicerResult.supportWeight}g`);
        if (slicerResult.towerWeight > 0) console.log(`   Tower weight: ${slicerResult.towerWeight}g`);
        if (slicerResult.purgeWeight > 0) console.log(`   Purge weight: ${slicerResult.purgeWeight}g`);
        console.log(`   Total weight: ${weightGrams}g`);
        if (slicerResult.extruderCount > 1) console.log(`   Colors/Extruders: ${slicerResult.extruderCount}`);
        console.log(`   Print time: ${slicerResult.printTime || 'N/A'}`);
        console.log(`   Raw cost: ₹${rawCost} (single unit)`);
        console.log(`   Final price: ₹${estimatedPrice} (${quantityInt}x units)`);
        
      } else {
        // Only STL and 3MF files are supported
        return res.status(400).json({
          success: false,
          message: `File type ${fileExtension} is not supported. Please upload STL or 3MF files only.`,
        });
      }
    } finally {
      // Step 5: Cleanup temp file
      if (tempFilePath) {
        try {
          await fs.promises.unlink(tempFilePath);
          console.log(`🗑️  Cleaned up temp file: ${path.basename(tempFilePath)}`);
        } catch (cleanupError: any) {
          console.error('Failed to cleanup temp file:', cleanupError.message);
        }
      }
    }

    console.log('💰 Final pricing:', { estimatedPrice, pricingData });

    // Ensure price is a valid number
    const finalEstimatedPrice = estimatedPrice || 0;

    const customDesign = await prisma.customDesign.create({
      data: {
        userId,
        name,
        description,
        material,
        color,
        size,
        quantity: quantityInt,
        fileUrl: file.location, // S3 URL from multer-s3
        status: CustomDesignStatus.PENDING,
        estimatedPrice: finalEstimatedPrice,
        filamentGrams: pricingData?.filament_grams || null,
        printTimeSeconds: pricingData?.print_time_seconds || null,
        modelWeightGrams: pricingData?.model_weight_grams || null,
        supportWeightGrams: pricingData?.support_weight_grams || null,
        towerWeightGrams: pricingData?.tower_weight_grams || null,
        purgeWeightGrams: pricingData?.purge_weight_grams || null,
        extruderCount: pricingData?.extruder_count || null,
      },
    });


    // Send email notification to admin (non-blocking)
    emailService.send3DDesignNotification({
      customerName: userEmail || 'Customer',
      customerEmail: userEmail || '',
      designName: name,
      material,
      color,
      quantity: quantityInt,
      fileUrl: file.location,
      fileName: file.originalname,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      estimatedPrice: finalEstimatedPrice,
      infillPercentage: parseInt(infillPercentage) || 20,
      layerHeight: parseFloat(layerHeight) || 0.2,
    }).catch(error => {
      console.error('Failed to send 3D design notification email:', error);
    });

    console.log('📝 Preparing response payload...');
    const responsePayload = {
      success: true,
      message: 'Custom design request submitted successfully',
      customDesign: {
        ...customDesign,
      },
      pricing: pricingData,
      // Raw material calculation results (top-level for convenience)
      weight_grams: pricingData?.filament_grams || null,
      raw_material_cost: pricingData?.final_price ? Math.round(pricingData.final_price / quantityInt) : null,
      filament_grams: pricingData?.filament_grams || null,
      print_time_seconds: pricingData?.print_time_seconds || null,
    };

    console.log('✅ Sending success response...');
    res.status(201).json(responsePayload);
    console.log('✅ Response sent successfully');
    
  } catch (error: any) {
    console.error('Create custom design error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create custom design request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getUserCustomDesigns = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { limit = 20, offset = 0 } = req.query;

    const customDesigns = await prisma.customDesign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.customDesign.count({
      where: { userId },
    });

    res.json({
      success: true,
      data: {
        customDesigns,
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('Get user custom designs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom designs',
    });
  }
};

export const getCustomDesignById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const customDesign = await prisma.customDesign.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!customDesign) {
      return res.status(404).json({
        success: false,
        message: 'Custom design not found',
      });
    }

    // Check ownership or admin access
    if (customDesign.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: { customDesign },
    });
  } catch (error) {
    console.error('Get custom design by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom design',
    });
  }
};

export const updateCustomDesignStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const { id } = req.params;
    const { status, estimatedPrice } = req.body;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const validStatuses = Object.values(CustomDesignStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const updateData: any = { status };
    if (estimatedPrice !== undefined) {
      updateData.estimatedPrice = estimatedPrice;
    }

    const customDesign = await prisma.customDesign.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Custom design status updated successfully',
      data: { customDesign },
    });
  } catch (error) {
    console.error('Update custom design status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update custom design status',
    });
  }
};

export const getAllCustomDesigns = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { limit = 50, offset = 0, status } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const customDesigns = await prisma.customDesign.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.customDesign.count({ where });

    res.json({
      success: true,
      data: {
        customDesigns,
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('Get all custom designs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom designs',
    });
  }
};
