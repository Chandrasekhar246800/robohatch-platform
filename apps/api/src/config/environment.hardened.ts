/**
 * Environment Validator (Hardened Version)
 * ✅ Validates ALL required environment variables at startup
 * ✅ Server crashes if critical vars missing (fail-fast)
 * ✅ NO FALLBACKS for security-critical values
 */

interface HardenedEnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  
  // Database
  DATABASE_URL: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  
  // Bcrypt
  BCRYPT_ROUNDS: number;
  
  // Razorpay
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  
  // CORS
  CORS_ORIGIN: string;
  
  // URLs
  FRONTEND_URL: string;
}

/**
 * Validate and parse environment variables
 * 🔒 SECURITY: Crashes if required variables missing
 */
export function validateEnvironment(): HardenedEnvironmentConfig {
  const errors: string[] = [];

  // Required variables
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'CORS_ORIGIN',
    'FRONTEND_URL',
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`❌ Missing required environment variable: ${key}`);
    }
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push(
      '❌ JWT_SECRET must be at least 32 characters long for production security'
    );
  }

  // Validate Razorpay webhook secret
  if (
    process.env.RAZORPAY_WEBHOOK_SECRET &&
    process.env.RAZORPAY_WEBHOOK_SECRET.length < 16
  ) {
    errors.push(
      '❌ RAZORPAY_WEBHOOK_SECRET must be at least 16 characters long'
    );
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'test', 'production'];
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!validEnvs.includes(nodeEnv)) {
    errors.push(
      `❌ NODE_ENV must be one of: ${validEnvs.join(', ')}. Got: ${nodeEnv}`
    );
  }

  // Validate PORT
  const port = parseInt(process.env.PORT || '5000', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push(`❌ PORT must be a valid port number (1-65535). Got: ${process.env.PORT}`);
  }

  // Validate BCRYPT_ROUNDS
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  if (isNaN(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 20) {
    errors.push(
      `❌ BCRYPT_ROUNDS must be between 10-20 for security. Got: ${process.env.BCRYPT_ROUNDS}`
    );
  }

  // Validate JWT_EXPIRES_IN format
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const validJwtExpiry = /^\d+[hdms]$/.test(jwtExpiresIn);
  if (!validJwtExpiry) {
    errors.push(
      `❌ JWT_EXPIRES_IN must be in format: 7d, 24h, 60m, etc. Got: ${jwtExpiresIn}`
    );
  }

  // 🔒 FAIL FAST: Crash if any validation errors
  if (errors.length > 0) {
    console.error('🚨 ENVIRONMENT VALIDATION FAILED:');
    errors.forEach((error) => console.error(error));
    console.error('\n💡 Set these variables in your .env file or deployment environment');
    process.exit(1);
  }

  // Return validated config
  const config: HardenedEnvironmentConfig = {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: jwtExpiresIn,
    BCRYPT_ROUNDS: bcryptRounds,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID!,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET!,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET!,
    CORS_ORIGIN: process.env.CORS_ORIGIN!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
  };

  // Log success
  console.log('✅ Environment validation passed');
  console.log('📋 Configuration:', {
    NODE_ENV: config.NODE_ENV,
    PORT: config.PORT,
    DATABASE_URL: config.DATABASE_URL.replace(/\/\/.*:.*@/, '//***:***@'), // Hide credentials
    JWT_SECRET: '***' + config.JWT_SECRET.slice(-4),
    JWT_EXPIRES_IN: config.JWT_EXPIRES_IN,
    BCRYPT_ROUNDS: config.BCRYPT_ROUNDS,
    RAZORPAY_KEY_ID: config.RAZORPAY_KEY_ID.slice(0, 8) + '***',
    RAZORPAY_KEY_SECRET: '***' + config.RAZORPAY_KEY_SECRET.slice(-4),
    RAZORPAY_WEBHOOK_SECRET: '***' + config.RAZORPAY_WEBHOOK_SECRET.slice(-4),
    CORS_ORIGIN: config.CORS_ORIGIN,
    FRONTEND_URL: config.FRONTEND_URL,
  });

  return config;
}
