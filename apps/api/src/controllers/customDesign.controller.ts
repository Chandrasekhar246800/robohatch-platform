import { Response } from 'express';
import { AuthRequest } from '../middlewares';
import { prisma } from '../config/prisma';
import { emailService } from '../services/email.service';
import { stlAnalysisService } from '../services/stlAnalysis.service';
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
    pla: 1.2,
    abs: 1.5,
    petg: 1.8,
    tpu: 2.5,
  };
  return costs[material] || 1.2; // Default to PLA cost
};

/**
 * Calculate estimated price based on 3D design parameters (fallback)
 * Used when STL analysis fails or for non-STL files
 */
const calculateEstimatedPrice = (params: {
  fileSize: number; // in bytes
  material: string;
  quantity: number;
  infillPercentage?: number;
  layerHeight?: number;
}): number => {
  const { fileSize, material, quantity, infillPercentage = 20, layerHeight = 0.2 } = params;
  const materialLower = material.toLowerCase();

  // Base price calculation
  const basePrice = 300;

  // Special handling for resin (volume-based estimate)
  if (materialLower === 'resin') {
    // Rough estimate: 1MB file ≈ 10cm³ volume
    const estimatedVolumeCm3 = (fileSize / (1024 * 1024)) * 10;
    const resinCostPerCm3 = 3.5;
    const machineCostPerHour = 30;
    const electricityCostPerHour = 6;
    
    // Estimate print time (rough): 1cm³ ≈ 10 minutes
    const estimatedPrintTimeHours = (estimatedVolumeCm3 * 10) / 60;
    
    const materialCost = estimatedVolumeCm3 * resinCostPerCm3;
    const machineCost = estimatedPrintTimeHours * machineCostPerHour;
    const electricityCost = estimatedPrintTimeHours * electricityCostPerHour;
    
    const baseCost = materialCost + machineCost + electricityCost;
    const priceWithProfit = baseCost * 1.45; // 45% profit margin
    
    return Math.round(priceWithProfit * quantity);
  }

  // FDM material pricing
  const materialPrices: Record<string, number> = {
    pla: 0,
    abs: 50,
    petg: 75,
    tpu: 100,
  };
  const materialPrice = materialPrices[materialLower] || 0;

  // File size factor
  const fileSizeFactor = Math.round((fileSize / (1024 * 1024)) * 100);

  // Infill percentage factor
  const infillFactor = Math.round((infillPercentage / 20) * 50);

  // Layer height factor
  const layerHeightFactor = layerHeight === 0.1 ? 100 : layerHeight === 0.2 ? 50 : 25;

  // Calculate total per unit
  const pricePerUnit = basePrice + materialPrice + fileSizeFactor + infillFactor + layerHeightFactor;

  return Math.round(pricePerUnit * quantity);
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
      print_time_seconds?: number;
      final_price: number;
    } = {
      accurate: false,
      final_price: 0,
    };

    let tempFilePath: string | null = null;

    try {
      if (is3DFile) {
        console.log(`🔬 3D file detected (${fileExtension}) - attempting accurate analysis...`);
        try {
          // Step 1: Download file from S3 to temp location
          const s3Key = getS3KeyFromUrl(file.key || file.location);
          console.log(`📥 Downloading file from S3: ${s3Key}`);
          tempFilePath = await downloadFromS3(s3Key);
          console.log(`✓ Downloaded to: ${tempFilePath}`);

          // Step 2: Build custom pricing (kept for interface compatibility)
          const customPricing = materialLower === 'resin' ? {
            materialCostPerGram: 0,
            machineCostPerHour: 30,
            electricityCostPerHour: 6,
            profitMarginPercent: 45,
          } : {
            materialCostPerGram: 4.5,
            machineCostPerHour: 0,
            electricityCostPerHour: 0,
            profitMarginPercent: 0,
          };

          // Step 3: Analyze with new 3D file analysis
          console.log('⏳ Analyzing with 3D file analysis...');
          const analysis = await stlAnalysisService.analyze3DFileFromPath(
            tempFilePath,
            customPricing
          );

          // Step 4: Use accurate price if analysis succeeded
          if (analysis.success && analysis.price_inr) {
            estimatedPrice = Math.round(analysis.price_inr * quantityInt);
            pricingData = {
              accurate: true,
              filament_grams: analysis.filament_grams,
              print_time_seconds: analysis.print_time_seconds,
              final_price: estimatedPrice,
            };
            console.log(`✅ Accurate analysis complete: ₹${estimatedPrice}`);
          } else {
            throw new Error(analysis.error || 'Analysis returned no price');
          }
        } catch (analysisError: any) {
          console.error('⚠️  3D file analysis failed:', analysisError.message);
          console.log('Falling back to file-size estimation...');
          // Fallback to simple calculation
          estimatedPrice = calculateEstimatedPrice({
            fileSize: file.size,
            material: materialLower,
            quantity: quantityInt,
            infillPercentage: parseInt(infillPercentage) || 20,
            layerHeight: parseFloat(layerHeight) || 0.2,
          });
          pricingData = {
            accurate: false,
            final_price: estimatedPrice,
          };
        }
      } else {
        // Non-3D files: use file-size estimation
        console.log(`📄 Non-3D file (${fileExtension}) - using estimation`);
        estimatedPrice = calculateEstimatedPrice({
          fileSize: file.size,
          material: materialLower,
          quantity: quantityInt,
          infillPercentage: parseInt(infillPercentage) || 20,
          layerHeight: parseFloat(layerHeight) || 0.2,
        });
        pricingData = {
          accurate: false,
          final_price: estimatedPrice,
        };
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

    // Ensure estimatedPrice is set
    if (!estimatedPrice || estimatedPrice === 0) {
      console.log('⚠️  No price calculated - using fallback estimation');
      estimatedPrice = calculateEstimatedPrice({
        fileSize: file.size,
        material: materialLower,
        quantity: quantityInt,
        infillPercentage: parseInt(infillPercentage) || 20,
        layerHeight: parseFloat(layerHeight) || 0.2,
      });
      pricingData.final_price = estimatedPrice;
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
        // filamentGrams: pricingData?.filament_grams || null, // Uncomment after migration
        // printTimeSeconds: pricingData?.print_time_seconds || null, // Uncomment after migration
      },
    });

    // Create a Product for this custom design so it can be added to cart
    // Store the customDesignId and weight info in the description for reference
    const weightInfo = pricingData?.filament_grams ? ` | Weight: ${pricingData.filament_grams.toFixed(1)}g` : '';
    const product = await prisma.product.create({
      data: {
        name: `Custom 3D Print: ${name}`,
        description: `[CUSTOM_DESIGN:${customDesign.id}] ${description || `Custom 3D printed design in ${material} (${color})`}${weightInfo}`,
        price: finalEstimatedPrice,
        stock: quantityInt, // Each custom design is unique, stock = quantity ordered
        isActive: true,
        // weight: pricingData?.filament_grams ? `${pricingData.filament_grams.toFixed(1)}g` : null, // Uncomment after migration
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

    res.status(201).json({
      success: true,
      message: 'Custom design request submitted successfully',
      customDesign: {
        ...customDesign,
        productId: product.id, // Include product ID for cart operations
      },
      pricing: pricingData,
    });
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
