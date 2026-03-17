import { Response } from 'express';
import { AuthRequest } from '../middlewares';
import { prisma } from '../config/prisma';
import { emailService } from '../services/email.service';
import { runPrusaSlicer } from '../services/prusaSlicer.service';
import { s3 } from '../config/s3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { z } from 'zod';
import { validate3DFileSignatureFromS3 } from '../utils/fileSignature';
import { getSignedS3UrlFromUrlOrKey } from '../utils/s3SignedUrl';

// Note: CustomDesignStatus will be available after running the migration
import { logger } from '../utils/logger';

const CustomDesignStatus = {
  PENDING: 'PENDING',
  QUOTED: 'QUOTED',
  APPROVED: 'APPROVED',
  IN_PRODUCTION: 'IN_PRODUCTION',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;

const MAX_PAGINATION_LIMIT = 100;

const customDesignInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  material: z.enum(['pla', 'abs', 'petg', 'tpu']),
  color: z.string().trim().min(1).max(50),
  size: z.string().trim().max(50).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(1000).default(1),
  isMultiColor: z.coerce.boolean().default(false),
  infillPercentage: z.coerce.number().min(5).max(100).optional(),
  layerHeight: z.coerce.number().min(0.05).max(1).optional(),
});

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
    logger.error('Failed to download from S3:', error);
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

    const signatureResult = await validate3DFileSignatureFromS3(
      file.key || file.location,
      file.originalname
    );

    if (!signatureResult.valid) {
      if (file.key) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: file.key,
          })
        );
      }

      return res.status(400).json({
        success: false,
        message: signatureResult.reason || 'Invalid 3D file signature',
      });
    }

    const parsedInput = customDesignInputSchema.safeParse(req.body);
    if (!parsedInput.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsedInput.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const {
      name,
      description,
      material,
      color,
      size,
      quantity,
      isMultiColor,
      infillPercentage,
      layerHeight,
    } = parsedInput.data;


    // Determine file extension and type
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const is3DFile = ['.stl', '.3mf', '.obj', '.gcode'].includes(fileExtension);
    const materialLower = material;
    const quantityInt = quantity;

    let estimatedPrice: number;
    let pricingData: {
      accurate: boolean;
      filament_grams?: number;
      model_weight_grams?: number;
      support_weight_grams?: number;
      tower_weight_grams?: number;
      purge_weight_grams?: number;
      total_weight_grams?: number;
      extruder_count?: number;
      infill_percentage?: number;
      print_time_seconds?: number;
      final_price: number;
    } = {
      accurate: false,
      final_price: 0,
    };

    let tempFilePath: string | null = null;

    try {
      if (is3DFile && (fileExtension === '.stl' || fileExtension === '.3mf')) {
        logger.info({ event: 'custom_design_analysis_started', fileExtension });
        
        // Step 1: Download file from S3 to temp location
        const s3Key = getS3KeyFromUrl(file.key || file.location);
        logger.debug({ event: 'custom_design_s3_download', s3Key });
        tempFilePath = await downloadFromS3(s3Key);
        logger.debug({ event: 'custom_design_download_complete', tempFilePath });

        const pricePerGram = getMaterialCostPerGram(materialLower);

        // Step 2: Run PrusaSlicer (ONLY method - no fallback)
        logger.info({ event: 'custom_design_slicing_started' });
        const slicerResult = await runPrusaSlicer(tempFilePath) as any;
        
        // Model + Support are always included
        // Tower + Purge are ONLY added for multi-color prints (where user selected multi-color option)
        let componentTotalWeight =
          (Number(slicerResult.modelWeight) || 0) +
          (Number(slicerResult.supportWeight) || 0);
        
        if (isMultiColor) {
          componentTotalWeight +=
            (Number(slicerResult.towerWeight) || 0) +
            (Number(slicerResult.purgeWeight) || 0);
        }
        
        const reportedTotalWeight = Number(slicerResult.totalWeight) || 0;
        const effectiveWeight = Math.max(componentTotalWeight, reportedTotalWeight);
        const weightGrams = Math.round(effectiveWeight * 100) / 100;
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
        
        // Calculate explicit sum of all weight components
        // Store exact values for logging/debugging
        const modelWtExact = slicerResult.modelWeight;
        const supportWtExact = slicerResult.supportWeight;
        const towerWtExact = isMultiColor ? slicerResult.towerWeight : 0;
        const purgeWtExact = isMultiColor ? slicerResult.purgeWeight : 0;
        const totalWtExact = effectiveWeight;
        
        // Rounded values for database storage (2 decimal places)
        const modelWt = Math.round(modelWtExact * 100) / 100;
        const supportWt = Math.round(supportWtExact * 100) / 100;
        const towerWt = Math.round(towerWtExact * 100) / 100;
        const purgeWt = Math.round(purgeWtExact * 100) / 100;
        const totalWt = Math.round((modelWt + supportWt + towerWt + purgeWt) * 100) / 100;
        
        pricingData = {
          accurate: true,
          filament_grams: totalWt,
          model_weight_grams: modelWt,
          support_weight_grams: supportWt,
          tower_weight_grams: towerWt,
          purge_weight_grams: purgeWt,
          total_weight_grams: totalWt, // Explicit sum: model + support + tower + purge
          extruder_count: slicerResult.extruderCount || 1,
          infill_percentage: 15, // Default infill from PrusaSlicer config
          print_time_seconds: printTimeSeconds,
          final_price: estimatedPrice,
        };
        
        logger.info({ event: 'custom_design_slicing_complete' });
        logger.info(`   📊 Weight Breakdown (isMultiColor: ${isMultiColor}):`);
        logger.info(`      • Model: ${modelWtExact.toFixed(4)}g exact → ${modelWt}g DB (actual part)`);
        logger.info(`      • Support: ${supportWtExact.toFixed(4)}g exact → ${supportWt}g DB`);
        if (isMultiColor) {
          logger.info(`      • Tower: ${towerWtExact <= 0 ? 0 : towerWtExact.toFixed(4)}g exact → ${towerWt}g DB (wipe tower - INCLUDED)`);
          logger.info(`      • Purged: ${purgeWtExact <= 0 ? 0 : purgeWtExact.toFixed(4)}g exact → ${purgeWt}g DB (waste - INCLUDED)`);
        } else {
          logger.info(`      • Tower: 0g (EXCLUDED - single color)`);
          logger.info(`      • Purged: 0g (EXCLUDED - single color)`);
        }
        logger.info(`      • TOTAL: ${totalWtExact.toFixed(4)}g exact → ${totalWt}g DB (sum of relevant components)`);
        logger.info(`   Colors/Extruders: ${slicerResult.extruderCount}`);
        logger.info(`   Infill: 15%`);
        logger.info(`   Print time: ${slicerResult.printTime || 'N/A'}`);
        logger.info(`   Multi-Color Selected: ${isMultiColor ? 'YES - Tower & Purge INCLUDED' : 'NO - Tower & Purge EXCLUDED'}`);
        logger.info(`   Raw cost: ₹${rawCost} (single unit)`);
        logger.info(`   Final price: ₹${estimatedPrice} (${quantityInt}x units)`);
        
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
          logger.debug({ event: 'custom_design_temp_cleanup', file: path.basename(tempFilePath) });
        } catch (cleanupError: any) {
          logger.warn({ event: 'custom_design_temp_cleanup_failed', message: cleanupError?.message });
        }
      }
    }

    logger.info({ event: 'custom_design_pricing_computed', estimatedPrice });

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
        totalWeightGrams: pricingData?.total_weight_grams || null,
        extruderCount: pricingData?.extruder_count || null,
        infillPercentage: pricingData?.infill_percentage || null,
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
      infillPercentage: infillPercentage || 20,
      layerHeight: layerHeight || 0.2,
    }).catch(error => {
      logger.error('Failed to send 3D design notification email:', error);
    });

    logger.debug({ event: 'custom_design_response_prepare' });
    
    // Convert Prisma Decimal fields to numbers for JSON serialization
    // Build response manually to ensure all Decimal fields are converted
    const customDesignResponse = {
      id: customDesign.id,
      userId: customDesign.userId,
      name: customDesign.name,
      description: customDesign.description,
      material: customDesign.material,
      color: customDesign.color,
      size: customDesign.size,
      quantity: customDesign.quantity,
      fileUrl: customDesign.fileUrl
        ? await getSignedS3UrlFromUrlOrKey(customDesign.fileUrl, 3600)
        : null,
      status: customDesign.status,
      createdAt: customDesign.createdAt,
      updatedAt: customDesign.updatedAt,
      // Convert all Decimal fields to numbers
      estimatedPrice: customDesign.estimatedPrice ? Number(customDesign.estimatedPrice) : null,
      filamentGrams: customDesign.filamentGrams ? Number(customDesign.filamentGrams) : null,
      modelWeightGrams: customDesign.modelWeightGrams ? Number(customDesign.modelWeightGrams) : null,
      supportWeightGrams: customDesign.supportWeightGrams ? Number(customDesign.supportWeightGrams) : null,
      towerWeightGrams: customDesign.towerWeightGrams ? Number(customDesign.towerWeightGrams) : null,
      purgeWeightGrams: customDesign.purgeWeightGrams ? Number(customDesign.purgeWeightGrams) : null,
      totalWeightGrams: customDesign.totalWeightGrams ? Number(customDesign.totalWeightGrams) : null,
      printTimeSeconds: customDesign.printTimeSeconds,
      extruderCount: customDesign.extruderCount,
      infillPercentage: customDesign.infillPercentage,
    };
    
    const responsePayload = {
      success: true,
      message: 'Custom design request submitted successfully',
      customDesign: customDesignResponse,
      pricing: pricingData,
      // Raw material calculation results (top-level for convenience)
      weight_grams: pricingData?.filament_grams || null,
      raw_material_cost: pricingData?.final_price ? Math.round(pricingData.final_price / quantityInt) : null,
      filament_grams: pricingData?.filament_grams || null,
      print_time_seconds: pricingData?.print_time_seconds || null,
    };

    try {
      res.status(201).json(responsePayload);
      logger.info({ event: 'custom_design_created', id: customDesignResponse.id, userId });
    } catch (jsonError: any) {
      logger.error({ event: 'custom_design_response_serialize_error', message: jsonError?.message });
      throw jsonError;
    }
    
  } catch (error: any) {
    logger.error({ event: 'custom_design_create_error', message: error?.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create custom design request',
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

    const parsedLimit = Number(req.query.limit ?? 20);
    const parsedOffset = Number(req.query.offset ?? 0);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.floor(parsedLimit), 1), MAX_PAGINATION_LIMIT)
      : 20;
    const offset = Number.isFinite(parsedOffset)
      ? Math.max(Math.floor(parsedOffset), 0)
      : 0;

    const customDesigns = await prisma.customDesign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.customDesign.count({
      where: { userId },
    });

    // Convert Decimal fields to numbers for JSON serialization
    const customDesignsResponse = await Promise.all(customDesigns.map(async (design) => ({
      ...design,
      fileUrl: design.fileUrl
        ? await getSignedS3UrlFromUrlOrKey(design.fileUrl, 3600)
        : null,
      estimatedPrice: design.estimatedPrice ? Number(design.estimatedPrice) : null,
      filamentGrams: design.filamentGrams ? Number(design.filamentGrams) : null,
      modelWeightGrams: design.modelWeightGrams ? Number(design.modelWeightGrams) : null,
      supportWeightGrams: design.supportWeightGrams ? Number(design.supportWeightGrams) : null,
      towerWeightGrams: design.towerWeightGrams ? Number(design.towerWeightGrams) : null,
      purgeWeightGrams: design.purgeWeightGrams ? Number(design.purgeWeightGrams) : null,
      totalWeightGrams: design.totalWeightGrams ? Number(design.totalWeightGrams) : null,
    })));

    res.json({
      success: true,
      data: {
        customDesigns: customDesignsResponse,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error({ event: 'get_user_custom_designs_error', error });
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

    // Convert Decimal fields to numbers for JSON serialization
    const customDesignResponse = {
      ...customDesign,
      fileUrl: customDesign.fileUrl
        ? await getSignedS3UrlFromUrlOrKey(customDesign.fileUrl, 3600)
        : null,
      estimatedPrice: customDesign.estimatedPrice ? Number(customDesign.estimatedPrice) : null,
      filamentGrams: customDesign.filamentGrams ? Number(customDesign.filamentGrams) : null,
      modelWeightGrams: customDesign.modelWeightGrams ? Number(customDesign.modelWeightGrams) : null,
      supportWeightGrams: customDesign.supportWeightGrams ? Number(customDesign.supportWeightGrams) : null,
      towerWeightGrams: customDesign.towerWeightGrams ? Number(customDesign.towerWeightGrams) : null,
      purgeWeightGrams: customDesign.purgeWeightGrams ? Number(customDesign.purgeWeightGrams) : null,
      totalWeightGrams: customDesign.totalWeightGrams ? Number(customDesign.totalWeightGrams) : null,
    };

    res.json({
      success: true,
      data: { customDesign: customDesignResponse },
    });
  } catch (error) {
    logger.error({ event: 'get_custom_design_by_id_error', error });
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

    // Convert Decimal fields to numbers for JSON serialization
    const customDesignResponse = {
      ...customDesign,
      estimatedPrice: customDesign.estimatedPrice ? Number(customDesign.estimatedPrice) : null,
      filamentGrams: customDesign.filamentGrams ? Number(customDesign.filamentGrams) : null,
      modelWeightGrams: customDesign.modelWeightGrams ? Number(customDesign.modelWeightGrams) : null,
      supportWeightGrams: customDesign.supportWeightGrams ? Number(customDesign.supportWeightGrams) : null,
      towerWeightGrams: customDesign.towerWeightGrams ? Number(customDesign.towerWeightGrams) : null,
      purgeWeightGrams: customDesign.purgeWeightGrams ? Number(customDesign.purgeWeightGrams) : null,
      totalWeightGrams: customDesign.totalWeightGrams ? Number(customDesign.totalWeightGrams) : null,
    };

    res.json({
      success: true,
      message: 'Custom design status updated successfully',
      data: { customDesign: customDesignResponse },
    });
  } catch (error) {
    logger.error({ event: 'update_custom_design_status_error', error });
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

    const parsedLimit = Number(req.query.limit ?? 50);
    const parsedOffset = Number(req.query.offset ?? 0);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.floor(parsedLimit), 1), MAX_PAGINATION_LIMIT)
      : 50;
    const offset = Number.isFinite(parsedOffset)
      ? Math.max(Math.floor(parsedOffset), 0)
      : 0;
    const { status } = req.query;

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
      take: limit,
      skip: offset,
    });

    const total = await prisma.customDesign.count({ where });

    // Convert Decimal fields to numbers for JSON serialization
    const customDesignsResponse = await Promise.all(customDesigns.map(async (design) => ({
      ...design,
      fileUrl: design.fileUrl
        ? await getSignedS3UrlFromUrlOrKey(design.fileUrl, 3600)
        : null,
      estimatedPrice: design.estimatedPrice ? Number(design.estimatedPrice) : null,
      filamentGrams: design.filamentGrams ? Number(design.filamentGrams) : null,
      modelWeightGrams: design.modelWeightGrams ? Number(design.modelWeightGrams) : null,
      supportWeightGrams: design.supportWeightGrams ? Number(design.supportWeightGrams) : null,
      towerWeightGrams: design.towerWeightGrams ? Number(design.towerWeightGrams) : null,
      purgeWeightGrams: design.purgeWeightGrams ? Number(design.purgeWeightGrams) : null,
      totalWeightGrams: design.totalWeightGrams ? Number(design.totalWeightGrams) : null,
    })));

    res.json({
      success: true,
      data: {
        customDesigns: customDesignsResponse,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error({ event: 'get_all_custom_designs_error', error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom designs',
    });
  }
};
