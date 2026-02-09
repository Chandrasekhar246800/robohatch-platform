import { Response } from 'express';
import { AuthRequest } from '../middlewares';
import { prisma } from '../config/prisma';

// Note: CustomDesignStatus will be available after running the migration
const CustomDesignStatus = {
  PENDING: 'PENDING',
  QUOTED: 'QUOTED',
  APPROVED: 'APPROVED',
  IN_PRODUCTION: 'IN_PRODUCTION',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;

export const createCustomDesign = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const {
      name,
      description,
      material,
      color,
      size,
      quantity,
      fileUrl,
    } = req.body;

    if (!name || !material || !color) {
      return res.status(400).json({
        success: false,
        message: 'Name, material, and color are required',
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
        quantity: quantity || 1,
        fileUrl,
        status: CustomDesignStatus.PENDING,
      },
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
