import express from "express";
import cors from "cors";
import compression from "compression";
import environment from "./config/environment";
import {
  securityHeaders,
  generalRateLimiter,
  authRateLimiter,
  sensitiveOperationLimiter,
  requestLogger,
  productionSecurityHeaders,
  rateLimitErrorHandler,
} from "./middlewares/security.middleware";
import testRoutes from "./routes/test.route";
import authRoutes from "./routes/auth.route";
import cartRoutes from "./routes/cart.route";
import orderRoutes from "./routes/order.route";
import paymentRoutes from "./routes/payment.route";
import productRoutes from "./routes/product.route";
import categoryRoutes from "./routes/category.route";
import customDesignRoutes from "./routes/customDesign.route";

const app = express();

// Security middleware - Apply first
app.use(securityHeaders);
app.use(productionSecurityHeaders);

// Request logging
app.use(requestLogger);

// Compression middleware for better performance
app.use(compression());

// Configure CORS with environment variables
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (environment.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24 hours
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (no rate limiting)
app.get("/health", (_, res) => {
  res.status(200).json({ 
    status: "OK",
    environment: environment.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Apply general rate limiting to all API routes
app.use("/api", generalRateLimiter);

// Public routes
app.use("/test", testRoutes);

// Authentication routes with strict rate limiting
app.use("/api/auth", authRateLimiter, authRoutes);

// Public endpoints (with general rate limiting)
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);

// Protected routes with sensitive operation limiting
app.use("/api/cart", cartRoutes);
app.use("/api/orders", sensitiveOperationLimiter, orderRoutes);
app.use("/api/payment", sensitiveOperationLimiter, paymentRoutes);
app.use("/api/custom-designs", customDesignRoutes);

// Admin routes (already protected by auth middleware in routes)
app.use("/api/admin/products", productRoutes);
app.use("/api/admin/categories", categoryRoutes);

// Rate limit error handler
app.use(rateLimitErrorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);
  
  // Don't leak error details in production
  const message = environment.isProduction 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({
    success: false,
    message,
    ...(environment.isDevelopment && { stack: err.stack }),
  });
});

export default app;
