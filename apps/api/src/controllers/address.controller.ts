import { Request, Response } from 'express';
import { addressService } from '../services/address.service';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';

// Validation schemas
import { logger } from '../utils/logger';

const createAddressSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
  addressLine1: z.string().min(5, 'Address must be at least 5 characters').max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(2, 'City must be at least 2 characters').max(100),
  state: z.string().min(2, 'State must be at least 2 characters').max(100),
  postalCode: z.string().min(5, 'Postal code must be at least 5 characters').max(10),
  country: z.string().max(100).optional(),
  isDefault: z.boolean().optional()
});

const updateAddressSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  addressLine1: z.string().min(5).max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  postalCode: z.string().min(5).max(10).optional(),
  country: z.string().max(100).optional()
});

export class AddressController {
  /**
   * GET /api/addresses - Get all user addresses
   */
  async getUserAddresses(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const addresses = await addressService.getUserAddresses(userId);

      res.status(200).json({
        success: true,
        data: addresses
      });
    } catch (error) {
      logger.error('Error in getUserAddresses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch addresses'
      });
    }
  }

  /**
   * GET /api/addresses/:id - Get a single address
   */
  async getAddressById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const addressId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const address = await addressService.getAddressById(addressId, userId);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      res.status(200).json({
        success: true,
        data: address
      });
    } catch (error) {
      logger.error('Error in getAddressById:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch address'
      });
    }
  }

  /**
   * POST /api/addresses - Create a new address
   */
  async createAddress(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Validate request body
      const validationResult = createAddressSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid address data',
          errors: validationResult.error.issues
        });
      }

      const addressData = validationResult.data;
      const address = await addressService.createAddress(userId, addressData);

      res.status(201).json({
        success: true,
        message: 'Address created successfully',
        data: address
      });
    } catch (error) {
      logger.error('Error in createAddress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create address'
      });
    }
  }

  /**
   * PUT /api/addresses/:id - Update an address
   */
  async updateAddress(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const addressId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Validate request body
      const validationResult = updateAddressSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid address data',
          errors: validationResult.error.issues
        });
      }

      const addressData = validationResult.data;
      const address = await addressService.updateAddress(addressId, userId, addressData);

      res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: address
      });
    } catch (error: any) {
      logger.error('Error in updateAddress:', error);
      
      if (error.message === 'Address not found or unauthorized') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update address'
      });
    }
  }

  /**
   * DELETE /api/addresses/:id - Delete an address
   */
  async deleteAddress(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const addressId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      await addressService.deleteAddress(addressId, userId);

      res.status(200).json({
        success: true,
        message: 'Address deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error in deleteAddress:', error);

      if (error.message === 'Address not found or unauthorized') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete address'
      });
    }
  }

  /**
   * PUT /api/addresses/:id/default - Set an address as default
   */
  async setDefaultAddress(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const addressId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const address = await addressService.setDefaultAddress(addressId, userId);

      res.status(200).json({
        success: true,
        message: 'Default address updated successfully',
        data: address
      });
    } catch (error: any) {
      logger.error('Error in setDefaultAddress:', error);

      if (error.message === 'Address not found or unauthorized') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to set default address'
      });
    }
  }

  /**
   * GET /api/addresses/default - Get user's default address
   */
  async getDefaultAddress(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const address = await addressService.getDefaultAddress(userId);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'No default address found'
        });
      }

      res.status(200).json({
        success: true,
        data: address
      });
    } catch (error) {
      logger.error('Error in getDefaultAddress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch default address'
      });
    }
  }
}

export const addressController = new AddressController();
