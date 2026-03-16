import { prisma } from '../config/prisma';

import { logger } from '../utils/logger';

export class AddressService {
  /**
   * Get all addresses for a user
   * @param userId - User ID
   * @returns Array of addresses (default address first)
   */
  async getUserAddresses(userId: string) {
    try {
      const addresses = await prisma.address.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' }, // Default address first
          { createdAt: 'desc' }  // Then by newest
        ]
      });

      logger.info(`Found ${addresses.length} addresses for user ${userId}`);
      return addresses;
    } catch (error) {
      logger.error('Error fetching user addresses:', error);
      throw new Error('Failed to fetch addresses');
    }
  }

  /**
   * Get a single address by ID
   * @param addressId - Address ID
   * @param userId - User ID (for authorization)
   * @returns Address or null
   */
  async getAddressById(addressId: string, userId: string) {
    try {
      const address = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId // Ensure user owns this address
        }
      });

      return address;
    } catch (error) {
      logger.error('Error fetching address:', error);
      throw new Error('Failed to fetch address');
    }
  }

  /**
   * Create a new address
   * @param userId - User ID
   * @param addressData - Address details
   * @returns Created address
   */
  async createAddress(
    userId: string,
    addressData: {
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      isDefault?: boolean;
    }
  ) {
    try {
      // If this is marked as default or it's the user's first address, set it as default
      const existingAddresses = await prisma.address.count({
        where: { userId }
      });

      const shouldBeDefault = addressData.isDefault || existingAddresses === 0;

      // If setting as default, remove default flag from other addresses
      if (shouldBeDefault) {
        await prisma.address.updateMany({
          where: {
            userId,
            isDefault: true
          },
          data: { isDefault: false }
        });
      }

      const address = await prisma.address.create({
        data: {
          userId,
          fullName: addressData.fullName,
          phone: addressData.phone,
          addressLine1: addressData.addressLine1,
          addressLine2: addressData.addressLine2 || null,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country || 'India',
          isDefault: shouldBeDefault
        }
      });

      logger.info(`Created address ${address.id} for user ${userId}`);
      return address;
    } catch (error) {
      logger.error('Error creating address:', error);
      throw new Error('Failed to create address');
    }
  }

  /**
   * Update an existing address
   * @param addressId - Address ID
   * @param userId - User ID (for authorization)
   * @param addressData - Updated address details
   * @returns Updated address
   */
  async updateAddress(
    addressId: string,
    userId: string,
    addressData: {
      fullName?: string;
      phone?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    }
  ) {
    try {
      // Verify user owns this address
      const existingAddress = await this.getAddressById(addressId, userId);
      if (!existingAddress) {
        throw new Error('Address not found or unauthorized');
      }

      const updatedAddress = await prisma.address.update({
        where: { id: addressId },
        data: {
          ...(addressData.fullName && { fullName: addressData.fullName }),
          ...(addressData.phone && { phone: addressData.phone }),
          ...(addressData.addressLine1 && { addressLine1: addressData.addressLine1 }),
          ...(addressData.addressLine2 !== undefined && { addressLine2: addressData.addressLine2 || null }),
          ...(addressData.city && { city: addressData.city }),
          ...(addressData.state && { state: addressData.state }),
          ...(addressData.postalCode && { postalCode: addressData.postalCode }),
          ...(addressData.country && { country: addressData.country })
        }
      });

      logger.info(`Updated address ${addressId}`);
      return updatedAddress;
    } catch (error) {
      logger.error('Error updating address:', error);
      throw error;
    }
  }

  /**
   * Delete an address
   * @param addressId - Address ID
   * @param userId - User ID (for authorization)
   */
  async deleteAddress(addressId: string, userId: string) {
    try {
      // Verify user owns this address
      const existingAddress = await this.getAddressById(addressId, userId);
      if (!existingAddress) {
        throw new Error('Address not found or unauthorized');
      }

      const wasDefault = existingAddress.isDefault;

      await prisma.address.delete({
        where: { id: addressId }
      });

      // If deleted address was default, set another address as default
      if (wasDefault) {
        const remainingAddresses = await prisma.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });

        if (remainingAddresses) {
          await prisma.address.update({
            where: { id: remainingAddresses.id },
            data: { isDefault: true }
          });
          logger.info(`Set address ${remainingAddresses.id} as new default`);
        }
      }

      logger.info(`Deleted address ${addressId}`);
    } catch (error) {
      logger.error('Error deleting address:', error);
      throw error;
    }
  }

  /**
   * Set an address as default
   * @param addressId - Address ID
   * @param userId - User ID (for authorization)
   * @returns Updated address
   */
  async setDefaultAddress(addressId: string, userId: string) {
    try {
      // Verify user owns this address
      const existingAddress = await this.getAddressById(addressId, userId);
      if (!existingAddress) {
        throw new Error('Address not found or unauthorized');
      }

      // Remove default flag from all user's addresses
      await prisma.address.updateMany({
        where: {
          userId,
          isDefault: true
        },
        data: { isDefault: false }
      });

      // Set this address as default
      const updatedAddress = await prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true }
      });

      logger.info(`Set address ${addressId} as default for user ${userId}`);
      return updatedAddress;
    } catch (error) {
      logger.error('Error setting default address:', error);
      throw error;
    }
  }

  /**
   * Get user's default address
   * @param userId - User ID
   * @returns Default address or null
   */
  async getDefaultAddress(userId: string) {
    try {
      const defaultAddress = await prisma.address.findFirst({
        where: {
          userId,
          isDefault: true
        }
      });

      return defaultAddress;
    } catch (error) {
      logger.error('Error fetching default address:', error);
      throw new Error('Failed to fetch default address');
    }
  }
}

export const addressService = new AddressService();
