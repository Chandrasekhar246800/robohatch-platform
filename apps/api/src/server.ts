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
const gracefulShutdown = (signal: string) => {
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    console.log('👋 Shutdown complete');
    process.exit(0);
  });
  
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
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
  if (environment.isProduction) {
    // In production, log but don't crash immediately
    // Consider sending to error tracking service (Sentry)
    console.error('⚠️  Server continuing in production mode');
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Stack:', error.stack);
  // Always exit on uncaught exceptions
  process.exit(1);
});

export default server;
