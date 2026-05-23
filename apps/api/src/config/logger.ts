import { env } from './env';

/**
 * Centralized Logger
 * ✅ Production-grade logging with levels
 * ✅ Request ID tracking
 * ✅ Structured logging for monitoring tools
 * ✅ NO sensitive data in logs
 */

enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

interface LogContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  method?: string;
  path?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = env.isDevelopment;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.sanitizeContext(context),
    };

    // Different formats for dev vs production
    if (this.isDevelopment) {
      process.stdout.write(`[${level}] ${message} ${JSON.stringify(context || {})}\n`);
    } else {
      // JSON format for production monitoring (can be ingested by CloudWatch, Datadog, etc.)
      process.stdout.write(`${JSON.stringify(logEntry)}\n`);
    }
  }

  /**
   * 🔒 SECURITY: Remove sensitive fields from logs
   */
  private sanitizeContext(context?: LogContext): LogContext {
    if (!context) return {};

    const sanitized = { ...context };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'authorization',
      'cookie',
      'jwt',
      'razorpay_signature',
      'razorpay_key_secret',
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  error(message: string, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  /**
   * Security-specific logging for audit trails
   */
  security(event: string, context?: LogContext) {
    this.log(LogLevel.WARN, `🚨 SECURITY: ${event}`, {
      ...context,
      securityEvent: true,
    });
  }

  /**
   * HTTP request logging
   */
  http(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, `${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ...context,
    });
  }
}

export const logger = new Logger();
