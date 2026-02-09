import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const paymentController = new PaymentController();

// All payment routes require authentication
router.use(authMiddleware);

// Create order from cart
router.post('/orders', (req, res) => paymentController.createOrder(req, res));

// Initiate UPI payment
router.post('/initiate', (req, res) => paymentController.initiatePayment(req, res));

// Verify payment
router.post('/verify', (req, res) => paymentController.verifyPayment(req, res));

// Get payment status for order
router.get('/status/:orderId', (req, res) => paymentController.getPaymentStatus(req, res));

// Get order with payment details
router.get('/orders/:orderId', (req, res) => paymentController.getOrderWithPayment(req, res));

export default router;
