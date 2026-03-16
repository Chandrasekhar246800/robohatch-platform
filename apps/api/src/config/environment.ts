import dotenv from 'dotenv';

// Load environment variables
import { logger } from '../utils/logger';

dotenv.config();

interface EnvironmentConfig {
  // Server
  NODE_ENV: string;
  PORT: number;
  
  // Database
  DATABASE_URL: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // AWS
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_S3_BUCKET: string;
  
  // CORS
  FRONTEND_URL: string;
  ALLOWED_ORIGINS: string[];
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Security
  BCRYPT_ROUNDS: number;
  
  // Helper methods
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

const getEnvironmentVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    logger.warn(`⚠️  Warning: Environment variable ${key} is not set`);
    return '';
  }
  return value || defaultValue || '';
};

const parseAllowedOrigins = (origins: string): string[] => {
  return origins
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
};

// Get default ALLOWED_ORIGINS based on environment
const getDefaultAllowedOrigins = (): string => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    // In production, default to all production domains
    return 'https://robohatch.in,https://www.robohatch.in,https://robohatch-platform-web.vercel.app,https://*.vercel.app,http://localhost:3000';
  }
  
  // In development, default to localhost
  return 'http://localhost:3000,http://localhost:3001,http://localhost:80';
};

const environment: EnvironmentConfig = {
  // Server
  NODE_ENV: getEnvironmentVariable('NODE_ENV', 'development'),
  PORT: parseInt(getEnvironmentVariable('PORT', '5000'), 10),
  
  // Database
  DATABASE_URL: getEnvironmentVariable('DATABASE_URL'),
  
  // JWT
  JWT_SECRET: getEnvironmentVariable('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvironmentVariable('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_SECRET: getEnvironmentVariable('JWT_REFRESH_SECRET', getEnvironmentVariable('JWT_SECRET')),
  JWT_REFRESH_EXPIRES_IN: getEnvironmentVariable('JWT_REFRESH_EXPIRES_IN', '7d'),
  
  // AWS
  AWS_ACCESS_KEY_ID: getEnvironmentVariable('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: getEnvironmentVariable('AWS_SECRET_ACCESS_KEY'),
  AWS_REGION: getEnvironmentVariable('AWS_REGION', 'eu-north-1'),
  AWS_S3_BUCKET: getEnvironmentVariable('AWS_S3_BUCKET'),
  
  // CORS - Use smart defaults based on environment
  FRONTEND_URL: getEnvironmentVariable('FRONTEND_URL', 'http://localhost:3000'),
  ALLOWED_ORIGINS: parseAllowedOrigins(
    getEnvironmentVariable('ALLOWED_ORIGINS', getDefaultAllowedOrigins())
  ),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(
    getEnvironmentVariable('RATE_LIMIT_WINDOW_MS', '900000'),
    10
  ), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    getEnvironmentVariable('RATE_LIMIT_MAX_REQUESTS', '100'),
    10
  ),
  
  // Security
  BCRYPT_ROUNDS: parseInt(getEnvironmentVariable('BCRYPT_ROUNDS', '10'), 10),
  
  // Helper methods
  get isProduction() {
    return this.NODE_ENV === 'production';
  },
  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },
  get isTest() {
    return this.NODE_ENV === 'test';
  },
};

// Validate critical environment variables
const validateEnvironment = () => {
  const criticalVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];
  
  const missing = criticalVars.filter(
    key => !process.env[key]
  );
  
  if (missing.length > 0) {
    logger.error('❌ Critical environment variables are missing:');
    missing.forEach(key => logger.error(`   - ${key}`));
    logger.error('\n📝 Please copy .env.example to .env and fill in the values');
    process.exit(1);
  }
  
  // Warn about default values in production
  if (environment.isProduction) {
    if (environment.JWT_SECRET.includes('change-in-production')) {
      logger.error('❌ JWT_SECRET must be changed in production!');
      process.exit(1);
    }
    
    if (environment.ALLOWED_ORIGINS.includes('localhost')) {
      logger.warn('⚠️  Warning: ALLOWED_ORIGINS includes localhost in production');
    }
  }
};

// Run validation
validateEnvironment();

export default environment;
