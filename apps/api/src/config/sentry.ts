import * as Sentry from '@sentry/node';

import { logger } from '../utils/logger';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * ✅ PRODUCTION HARDENING: Comprehensive error tracking
 * NOTE: Profiling disabled - requires native build tools
 */
export function initSentry(app: any) {
  // Only initialize if DSN is provided
  if (!process.env.SENTRY_DSN) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('⚠️  WARNING: SENTRY_DSN not configured in production');
      logger.warn('   Error tracking is recommended for production systems');
    } else {
      logger.info('ℹ️  Sentry not configured (development mode)');
    }
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    integrations: [
      // Express integration
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
    
    // Filter sensitive data
    beforeSend(event: any) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      
      // Don't send health check errors
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      'ECONNRESET',
      'ECONNREFUSED',
      'EPIPE',
      'ETIMEDOUT',
    ],
  });

  logger.info('✅ Sentry initialized successfully');
  logger.info(`   Environment: ${process.env.NODE_ENV}`);
  logger.info(`   Traces Sample Rate: ${process.env.NODE_ENV === 'production' ? '10%' : '100%'}`);
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message with level
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}

export default Sentry;
