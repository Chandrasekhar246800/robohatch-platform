import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const paymentController = new PaymentController();

// 🔒 RATE LIMITING: Protect payment endpoints from abuse
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Max 10 requests per minute per IP
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many payment attempts. Please wait a moment and try again.',
  },
  // Skip rate limiting for successful requests (optional)
  skipSuccessfulRequests: false,
  // Skip rate limiting for failed requests (optional)
  skipFailedRequests: false,
});

// All payment routes require authentication
router.use(authMiddleware);

// Step 1: Create order from cart (before payment)
router.post('/orders', (req, res) => paymentController.createOrder(req, res));

// Step 2: Create Razorpay order (initialize payment) - RATE LIMITED
router.post('/create-order/:orderId', paymentLimiter, (req, res) => 
  paymentController.createRazorpayOrder(req, res)
);

// Step 3: Verify payment signature (after user payment) - RATE LIMITED
router.post('/verify', paymentLimiter, (req, res) => 
  paymentController.verifyPayment(req, res)
);

// Handle payment failure - RATE LIMITED
router.post('/failure', paymentLimiter, (req, res) => 
  paymentController.handlePaymentFailure(req, res)
);

// Get payment status for order
router.get('/status/:orderId', (req, res) => paymentController.getPaymentStatus(req, res));

// Get order with payment details
router.get('/orders/:orderId', (req, res) => paymentController.getOrderWithPayment(req, res));

export default router;
