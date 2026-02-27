import { Response } from 'express';
import { AuthRequest } from '../middlewares';
import { prisma } from '../config/prisma';
import { emailService } from '../services/email.service';
import { stlAnalysisService } from '../services/stlAnalysis.service';
import path from 'path';

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
 * Calculate estimated price based on 3D design parameters
 * This is a simplified calculation - in production, you'd parse STL file for exact volume
 */
const calculateEstimatedPrice = (params: {
  fileSize: number; // in bytes
  material: string;
  quantity: number;
  infillPercentage?: number;
  layerHeight?: number;
}): number => {
  const { fileSize, material, quantity, infillPercentage = 20, layerHeight = 0.2 } = params;

  // Base price calculation
  const basePrice = 300; // Base printing fee

  // Material pricing
  const materialPrices: Record<string, number> = {
    pla: 0,
    abs: 50,
    petg: 75,
    tpu: 100,
    resin: 150,
  };
  const materialPrice = materialPrices[material.toLowerCase()] || 0;

  // File size factor (as proxy for model complexity/volume)
  // Assuming 1MB = ~₹100 in material and time cost
  const fileSizeFactor = Math.round((fileSize / (1024 * 1024)) * 100);

  // Infill percentage factor (higher infill = more material/time)
  const infillFactor = Math.round((infillPercentage / 20) * 50);

  // Layer height factor (lower layer = higher quality = more time)
  const layerHeightFactor = layerHeight === 0.1 ? 100 : layerHeight === 0.2 ? 50 : 25;

  // Calculate total per unit
  const pricePerUnit = basePrice + materialPrice + fileSizeFactor + infillFactor + layerHeightFactor;

  // Apply quantity
  const totalPrice = pricePerUnit * quantity;

  return Math.round(totalPrice);
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

    // Determine if file is STL for accurate analysis
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isSTLFile = fileExtension === '.stl';

    let estimatedPrice: number;
    let analysisData = null;

    // For STL files, use accurate PrusaSlicer analysis if available
    // Note: This requires the file to be accessible locally
    // Current implementation uses simple calculation as files are uploaded directly to S3
    // For production: Consider downloading from S3, analyzing, then deleting temp file
    if (isSTLFile && process.env.ENABLE_STL_ANALYSIS === 'true') {
      console.log('🔬 STL file detected - attempting accurate analysis...');
      
      // TODO: Implement S3 download for analysis
      // const s3File = await downloadFromS3(file.location);
      // const analysis = await stlAnalysisService.analyzeSTLFromPath(s3File);
      // if (analysis.success) {
      //   estimatedPrice = analysis.price_inr || 0;
      //   analysisData = analysis;
      // }
      
      // Fallback to simple calculation for now
      estimatedPrice = calculateEstimatedPrice({
        fileSize: file.size,
        material,
        quantity: parseInt(quantity) || 1,
        infillPercentage: parseInt(infillPercentage),
        layerHeight: parseFloat(layerHeight),
      });
      
      console.log('⚠️  Using simple file-size estimation. Enable STL analysis by downloading from S3.');
    } else {
      // Use simple file-size based calculation for non-STL or when analysis is disabled
      estimatedPrice = calculateEstimatedPrice({
        fileSize: file.size,
        material,
        quantity: parseInt(quantity) || 1,
        infillPercentage: parseInt(infillPercentage),
        layerHeight: parseFloat(layerHeight),
      });
    }

    const customDesign = await prisma.customDesign.create({
      data: {
        userId,
        name,
        description,
        material,
        color,
        size,
        quantity: parseInt(quantity) || 1,
        fileUrl: file.location, // S3 URL from multer-s3
        status: CustomDesignStatus.PENDING,
        estimatedPrice,
      },
    });

    // Send email notification to admin (non-blocking)
    emailService.send3DDesignNotification({
      customerName: userEmail || 'Customer',
      customerEmail: userEmail || '',
      designName: name,
      material,
      color,
      quantity: parseInt(quantity) || 1,
      fileUrl: file.location,
      fileName: file.originalname,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      estimatedPrice,
      infillPercentage: parseInt(infillPercentage) || 20,
      layerHeight: parseFloat(layerHeight) || 0.2,
    }).catch(error => {
      console.error('Failed to send 3D design notification email:', error);
    });

    res.status(201).json({
      success: true,
      message: 'Custom design request submitted successfully',
      data: { customDesign },
    });
  } catch (error) {
    console.error('Create custom design error:', error);
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
