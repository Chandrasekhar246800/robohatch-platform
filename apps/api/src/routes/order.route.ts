import { Router } from 'express';
import orderController from '../controllers/order.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All order routes require authentication
router.use(authMiddleware);

// Create order from cart
router.post('/', orderController.createOrder.bind(orderController));

// Get all user orders
router.get('/', orderController.getUserOrders.bind(orderController));

// Get order statistics
router.get('/stats', orderController.getOrderStats.bind(orderController));

// Get specific order
router.get('/:id', orderController.getOrder.bind(orderController));

// Update order status
router.put('/:id/status', orderController.updateOrderStatus.bind(orderController));

export default router;
