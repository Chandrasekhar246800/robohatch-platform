import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const webhookController = new WebhookController();

// 🔒 RATE LIMITING: Protect webhook from DDoS attacks
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // Max 100 webhook events per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many webhook requests',
  },
});

/**
 * 🔒 WEBHOOK ENDPOINT: Razorpay async notifications
 * 
 * IMPORTANT:
 * - This route should NOT use authMiddleware (Razorpay sends unauthenticated requests)
 * - Signature verification happens inside the controller
 * - This is your safety net for payments completed outside the app
 * 
 * Setup Instructions:
 * 1. Add RAZORPAY_WEBHOOK_SECRET to .env
 * 2. Configure webhook URL in Razorpay dashboard:
 *    https://yourdomain.com/api/webhook/razorpay
 * 3. Enable events: payment.captured, payment.failed, order.paid
 */
router.post(
  '/razorpay',
  webhookLimiter, // Apply rate limiting
  express.json(), // Parse JSON body
  (req, res) => webhookController.handleRazorpayWebhook(req, res)
);

export default router;
