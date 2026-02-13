import express from 'express';
import { addressController } from '../controllers/address.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = express.Router();

// All address routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/addresses
 * @desc    Get all user addresses
 * @access  Private
 */
router.get('/', addressController.getUserAddresses.bind(addressController));

/**
 * @route   GET /api/addresses/default
 * @desc    Get user's default address
 * @access  Private
 */
router.get('/default', addressController.getDefaultAddress.bind(addressController));

/**
 * @route   GET /api/addresses/:id
 * @desc    Get a single address by ID
 * @access  Private
 */
router.get('/:id', addressController.getAddressById.bind(addressController));

/**
 * @route   POST /api/addresses
 * @desc    Create a new address
 * @access  Private
 */
router.post('/', addressController.createAddress.bind(addressController));

/**
 * @route   PUT /api/addresses/:id
 * @desc    Update an address
 * @access  Private
 */
router.put('/:id', addressController.updateAddress.bind(addressController));

/**
 * @route   PUT /api/addresses/:id/default
 * @desc    Set an address as default
 * @access  Private
 */
router.put('/:id/default', addressController.setDefaultAddress.bind(addressController));

/**
 * @route   DELETE /api/addresses/:id
 * @desc    Delete an address
 * @access  Private
 */
router.delete('/:id', addressController.deleteAddress.bind(addressController));

export default router;
