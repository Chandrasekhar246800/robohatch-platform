import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logger } from '../utils/logger';

class ReviewController {
  async getReviewsByProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const reviews = await prisma.review.findMany({
        where: { productId: id, isApproved: true },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return res.status(200).json({ success: true, data: reviews });
    } catch (error: any) {
      logger.error('Get reviews error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
  }

  async createReview(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params; // product id
      const { rating, title, body } = req.body;

      if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }

      const userId = req.user?.userId;

      // Create review; require admin approval before it shows up
      const review = await prisma.review.create({
        data: {
          productId: id,
          userId: userId || undefined,
          rating: Number(rating),
          title: title || null,
          body: body || null,
          isApproved: false,
        },
      });

      return res.status(201).json({ success: true, data: review, message: 'Review submitted for approval' });
    } catch (error: any) {
      logger.error('Create review error:', error);
      return res.status(500).json({ success: false, message: 'Failed to submit review' });
    }
  }
}

export const reviewController = new ReviewController();
