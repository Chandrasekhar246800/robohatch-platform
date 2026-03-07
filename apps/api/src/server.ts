// Trigger Railway Dockerfile rebuild - March 8, 2026
import "dotenv/config";
import app from "./app";
import environment from "./config/environment";

const PORT = environment.PORT;

const server = app.listen(PORT, () => {
  console.log('\n🚀 RoboHatch API Server Started');
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Environment:  ${environment.NODE_ENV.toUpperCase()}`);
  console.log(`🌐 Server URL:   http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth APIs:    http://localhost:${PORT}/api/auth`);
  console.log(`🛒 Shop APIs:    http://localhost:${PORT}/api/products`);
  console.log(`🏷️  Categories:   http://localhost:${PORT}/api/categories`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  // CORS Configuration
  console.log(`\n🌍 CORS Configuration:`);
  console.log(`   Frontend URL: ${environment.FRONTEND_URL}`);
  console.log(`   Allowed Origins:`);
  environment.ALLOWED_ORIGINS.forEach(origin => {
    console.log(`     - ${origin}`);
  });
  
  if (environment.isDevelopment) {
    console.log('\n⚠️  Development mode - Rate limiting relaxed');
  } else {
    console.log(`\n🔒 Production mode - Security features enabled`);
    console.log(`🛡️  Rate limits: ${environment.RATE_LIMIT_MAX_REQUESTS} requests per ${environment.RATE_LIMIT_WINDOW_MS/60000} minutes`);
  }
  
  console.log('\n✅ Server is ready to accept connections\n');
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error(`   Try: kill -9 $(lsof -ti:${PORT}) or use a different PORT in .env`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    throw error;
  }
});

// Graceful shutdown
// ✅ PRODUCTION HARDENING: Enhanced graceful shutdown with database cleanup
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  
  // Close HTTP server first
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  // Close database connections
  try {
    const { prisma } = await import('./config/prisma');
    await prisma.$disconnect();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
  
  // Close Sentry client
  try {
    const Sentry = await import('@sentry/node');
    await Sentry.close(2000);
    console.log('✅ Sentry client closed');
  } catch (error) {
    // Sentry might not be initialized
  }
  
  console.log('👋 Shutdown complete');
  process.exit(0);
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
// ✅ PRODUCTION HARDENING: Report to Sentry in production
process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
  
  // Report to Sentry if available
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/node');
      Sentry.captureException(reason, {
        extra: { type: 'unhandledRejection' },
      });
    } catch (e) {
      // Sentry not available
    }
  }
  
  if (environment.isProduction) {
    // In production, log but don't crash immediately
    console.error('⚠️  Server continuing in production mode');
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
// ✅ PRODUCTION HARDENING: Report to Sentry before exiting
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Stack:', error.stack);
  
  // Report to Sentry if available
  if (process.env.SENTRY_DSN) {
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
