

import express from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { initSentry } from "./config/sentry";
import Sentry from "@sentry/node";
import { requestIdMiddleware } from "./middlewares/requestId.middleware";
import { csrfProtection } from "./middlewares/csrf.middleware";
import authRoutes from "./routes/auth.route";
import cartRoutes from "./routes/cart.route";
import orderRoutes from "./routes/order.route";
import paymentRoutes from "./routes/payment.route";
import webhookRoutes from "./routes/webhook.route";
import productRoutes from "./routes/product.route";
import categoryRoutes from "./routes/category.route";
import customDesignRoutes from "./routes/customDesign.route";
import customPhotoRoutes from "./routes/customPhoto.route";
import adminRoutes from "./routes/admin.route";
import contactRoutes from "./routes/contact.route";
import wishlistRoutes from "./routes/wishlist.route";
import addressRoutes from "./routes/address.route";
import { logger } from "./utils/logger";
import {
  securityHeaders,
  generalRateLimiter,
  authRateLimiter,
  sensitiveOperationLimiter,
  webhookRateLimiter,
  requestLogger,
  productionSecurityHeaders,
  rateLimitErrorHandler,
} from "./middlewares/security.middleware";
const app = express();
app.set("trust proxy", 1);

// ✅ PRODUCTION HARDENING: Initialize Sentry for error tracking
initSentry(app);

// Sentry request handler must be the first middleware (only if configured)
if (env.sentryDsn) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Request ID middleware for tracing
app.use(requestIdMiddleware);

// Security middleware - Apply first
app.use(securityHeaders);
app.use(productionSecurityHeaders);

// Request logging
app.use(requestLogger);

// Log all requests including OPTIONS for debugging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Compression middleware for better performance
app.use(compression());

// 🔒 COOKIE PARSER: Required for httpOnly authentication cookies
app.use(cookieParser());

// Configure CORS with environment variables
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      if (env.isProduction) {
        return callback(new Error('Not allowed by CORS'));
      }
      return callback(null, true);
    }
    
    // Check if origin is allowed
    const isAllowed = env.allowedOrigins.some((allowedOrigin: string) => {
      // Support wildcard matching (e.g., https://*.vercel.app)
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\./g, '\\.').replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`⚠️  CORS blocked request from origin: ${origin}`);
      logger.warn(`   Allowed origins: ${env.allowedOrigins.join(', ')}`);
      // Still allow the request but browser will block it
      callback(null, false);
    }
  },
  credentials: true, // 🔒 REQUIRED: Enable cookies for httpOnly authentication
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Handle preflight OPTIONS requests BEFORE rate limiting
app.options('*', cors());

// Double-submit CSRF protection for cookie-authenticated state-changing requests.
app.use(csrfProtection);

// Enhanced health check endpoint (no rate limiting)
// ✅ PRODUCTION HARDENING: Comprehensive health checks
app.get("/health", async (_, res) => {
  const health: any = {
    status: "OK",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
  };

  try {
    // 1. Database connectivity check
    const { prisma } = await import('./config/prisma');
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = { status: 'connected', message: 'MySQL connection healthy' };
  } catch (error: any) {
    health.checks.database = { status: 'error', message: error.message };
    health.status = 'DEGRADED';
  }

  try {
    // 2. Razorpay credentials check
    if (env.razorpayKeyId && env.razorpayKeySecret) {
      health.checks.razorpay = { status: 'configured', message: 'Payment gateway credentials present' };
    } else {
      health.checks.razorpay = { status: 'missing', message: 'Payment gateway not configured' };
      health.status = 'DEGRADED';
    }
  } catch (error: any) {
    health.checks.razorpay = { status: 'error', message: error.message };
  }

  try {
    // 3. S3 connectivity check
    if (env.awsAccessKeyId && env.awsSecretAccessKey) {
      health.checks.s3 = { status: 'configured', message: 'S3 storage credentials present' };
    } else {
      health.checks.s3 = { status: 'missing', message: 'S3 storage not configured' };
    }
  } catch (error: any) {
    health.checks.s3 = { status: 'error', message: error.message };
  }

  try {
    // 4. Email service check
    if (env.sendgridApiKey) {
      health.checks.email = { status: 'configured', message: 'Email service configured' };
    } else {
      health.checks.email = { status: 'missing', message: 'Email service not configured' };
      if (env.isProduction) {
        health.status = 'DEGRADED';
      }
    }
  } catch (error: any) {
    health.checks.email = { status: 'error', message: error.message };
  }

  // Set HTTP status based on health
  const httpStatus = health.status === 'OK' ? 200 : 503;
  res.status(httpStatus).json(health);
});

// Apply general rate limiting to all API routes
app.use("/api", generalRateLimiter);

// Authentication routes - only general rate limiting applied via /api
app.use("/api/auth", authRateLimiter, authRoutes);

// Public endpoints (with general rate limiting)
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/contact", contactRoutes);

// Protected routes with sensitive operation limiting
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", sensitiveOperationLimiter, orderRoutes);
app.use("/api/payment", sensitiveOperationLimiter, paymentRoutes);
app.use("/api/custom-designs", customDesignRoutes);
app.use("/api/custom-photos", customPhotoRoutes);

// Webhook routes are unauthenticated but signature-verified and rate-limited.
app.use("/api/webhook", webhookRateLimiter, webhookRoutes);

// Admin routes (already protected by auth middleware in routes)
app.use("/api/admin", adminRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/admin/categories", categoryRoutes);

// Rate limit error handler
app.use(rateLimitErrorHandler);

// ✅ PRODUCTION HARDENING: Sentry error handler (only if configured, before other error handlers)
if (env.sentryDsn) {
  app.use(Sentry.Handlers.errorHandler());
}

// 404 handler
app.use((req, res, next) => {
  logger.warn(`⚠️  404 - Endpoint not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`❌ Error [${(req as any).requestId || 'no-id'}]:`, err.message);
  logger.error(`   Path: ${req.method} ${req.path}`);
  logger.error(`   Origin: ${req.headers.origin || 'none'}`);
  
  // Capture error in Sentry (if not already captured)
  if (env.sentryDsn && !res.headersSent) {
    Sentry.captureException(err, {
      extra: {
        path: req.path,
        method: req.method,
        origin: req.headers.origin,
        requestId: (req as any).requestId,
      },
    });
  }
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: This origin is not allowed',
    });
  }
  
  // Don't leak error details in production
  const message = env.isProduction 
    ? 'Internal server error' 
    : err.message || 'Unknown error';
  
  const statusCode = err.status || err.statusCode || 500;
  
  logger.error(`   Status: ${statusCode}`);
  
  // Ensure we always send JSON
  if (!res.headersSent) {
    res.status(statusCode).json({
      success: false,
      message,
      ...(env.isDevelopment && { stack: err.stack }),
    });
  }
});

export default app;
