// Trigger Railway Dockerfile rebuild - March 8, 2026
import app from "./app";
import { env } from "./config/env";

import { logger } from './utils/logger';

const PORT = env.port;

const server = app.listen(PORT, () => {
  logger.info('\n🚀 RoboHatch API Server Started');
  logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  logger.info(`📍 Environment:  ${env.nodeEnv.toUpperCase()}`);
  logger.info(`🌐 Server URL:   http://localhost:${PORT}`);
  logger.info(`📊 Health Check: http://localhost:${PORT}/health`);
  logger.info(`🔐 Auth APIs:    http://localhost:${PORT}/api/auth`);
  logger.info(`🛒 Shop APIs:    http://localhost:${PORT}/api/products`);
  logger.info(`🏷️  Categories:   http://localhost:${PORT}/api/categories`);
  logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  // CORS Configuration
  logger.info(`\n🌍 CORS Configuration:`);
  logger.info(`   Frontend URL: ${env.frontendUrl}`);
  logger.info(`   Allowed Origins:`);
  env.allowedOrigins.forEach(origin => {
    logger.info(`     - ${origin}`);
  });
  
  if (env.isDevelopment) {
    logger.info('\n⚠️  Development mode - Rate limiting relaxed');
  } else {
    logger.info(`\n🔒 Production mode - Security features enabled`);
    logger.info(`🛡️  Rate limits: 100 requests per 15 minutes`);
  }
  
  logger.info('\n✅ Server is ready to accept connections\n');
});

// Global timeout protections against slow-client and slowloris style abuse
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use`);
    logger.error(`   Try: kill -9 $(lsof -ti:${PORT}) or use a different PORT in .env`);
    process.exit(1);
  } else {
    logger.error('❌ Server error:', error);
    throw error;
  }
});

// Graceful shutdown
// ✅ PRODUCTION HARDENING: Enhanced graceful shutdown with database cleanup
const gracefulShutdown = async (signal: string) => {
  logger.info(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  
  // Close HTTP server first
  server.close(() => {
    logger.info('✅ HTTP server closed');
  });
  
  // Close database connections
  try {
    const { prisma } = await import('./config/prisma');
    await prisma.$disconnect();
    logger.info('✅ Database connections closed');
  } catch (error) {
    logger.error('❌ Error closing database:', error);
  }
  
  // Close Sentry client
  try {
    const Sentry = await import('@sentry/node');
    await Sentry.close(2000);
    logger.info('✅ Sentry client closed');
  } catch (error) {
    // Sentry might not be initialized
  }
  
  logger.info('👋 Shutdown complete');
  process.exit(0);
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
// ✅ PRODUCTION HARDENING: Report to Sentry in production
process.on('unhandledRejection', async (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise);
  logger.error('❌ Reason:', reason);
  
  // Report to Sentry if available
  if (env.sentryDsn) {
    try {
      const Sentry = await import('@sentry/node');
      Sentry.captureException(reason, {
        extra: { type: 'unhandledRejection' },
      });
    } catch (e) {
      // Sentry not available
    }
  }
  
  if (env.isProduction) {
    // In production, log but don't crash immediately
    logger.error('⚠️  Server continuing in production mode');
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
// ✅ PRODUCTION HARDENING: Report to Sentry before exiting
process.on('uncaughtException', async (error) => {
  logger.error('❌ Uncaught Exception:', error);
  logger.error('❌ Stack:', error.stack);
  
  // Report to Sentry if available
  if (env.sentryDsn) {
    try {
      const Sentry = await import('@sentry/node');
      Sentry.captureException(error, {
        extra: { type: 'uncaughtException' },
      });
      await Sentry.close(2000); // Wait 2s for Sentry to send
    } catch (e) {
      // Sentry not available
    }
  }
  
  // Always exit on uncaught exceptions
  process.exit(1);
});

export default server;
