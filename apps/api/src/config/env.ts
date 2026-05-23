import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must be in a format like 15m or 7d')
    .default('15m'),
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_REFRESH_EXPIRES_IN must be in a format like 7d')
    .default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(20).default(12),
  SENDGRID_API_KEY: z.string().min(1, 'SENDGRID_API_KEY is required'),
  SENDGRID_FROM_EMAIL: z.string().min(1).default('noreply@robohatch.in'),
  SENDGRID_FROM_NAME: z.string().min(1).default('RoboHatch'),
  ORDERS_EMAIL: z.string().min(1).default('robohatchorders@gmail.com'),
  CONTACT_EMAIL: z.string().min(1).default('robohatchofficial@gmail.com'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  AWS_S3_BUCKET: z.string().min(1, 'AWS_S3_BUCKET is required'),
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
  COOKIE_DOMAIN: z.string().min(1).optional(),
  SENTRY_DSN: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  UPLOAD_DIR: z.string().min(1).default('/tmp/stl-uploads'),
  WHATSAPP_PROVIDER: z.string().min(1).optional(),
  WHATSAPP_API_KEY: z.string().min(1).optional(),
  WHATSAPP_API_URL: z.string().min(1).optional(),
  WHATSAPP_ORDERS_GROUP: z.string().min(1).optional(),
  WHATSAPP_CONTACTS_GROUP: z.string().min(1).optional(),
});

const formatIssue = (path: string[], message: string) => {
  const location = path.length > 0 ? path.join('.') : 'environment';
  return `- ${location}: ${message}`;
};

const redactDatabaseUrl = (value: string) => value.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Environment validation failed:');
  for (const issue of parsedEnv.error.issues) {
    console.error(formatIssue(issue.path.map(String), issue.message));
  }
  console.error('Startup aborted because one or more required environment variables are missing or invalid.');
  process.exit(1);
}

const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  jwtRefreshSecret: parsedEnv.data.JWT_REFRESH_SECRET,
  jwtExpiresIn: parsedEnv.data.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
  bcryptRounds: parsedEnv.data.BCRYPT_ROUNDS,
  sendgridApiKey: parsedEnv.data.SENDGRID_API_KEY,
  sendgridFromEmail: parsedEnv.data.SENDGRID_FROM_EMAIL,
  sendgridFromName: parsedEnv.data.SENDGRID_FROM_NAME,
  ordersEmail: parsedEnv.data.ORDERS_EMAIL,
  contactEmail: parsedEnv.data.CONTACT_EMAIL,
  awsAccessKeyId: parsedEnv.data.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: parsedEnv.data.AWS_SECRET_ACCESS_KEY,
  awsRegion: parsedEnv.data.AWS_REGION,
  awsS3Bucket: parsedEnv.data.AWS_S3_BUCKET,
  razorpayKeyId: parsedEnv.data.RAZORPAY_KEY_ID,
  razorpayKeySecret: parsedEnv.data.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: parsedEnv.data.RAZORPAY_WEBHOOK_SECRET,
  corsOrigin: parsedEnv.data.CORS_ORIGIN,
  allowedOrigins: parsedEnv.data.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  frontendUrl: parsedEnv.data.FRONTEND_URL,
  cookieDomain: parsedEnv.data.COOKIE_DOMAIN,
  sentryDsn: parsedEnv.data.SENTRY_DSN,
  logLevel: parsedEnv.data.LOG_LEVEL ?? (parsedEnv.data.NODE_ENV === 'production' ? 'info' : 'debug'),
  uploadDir: parsedEnv.data.UPLOAD_DIR,
  whatsappProvider: parsedEnv.data.WHATSAPP_PROVIDER,
  whatsappApiKey: parsedEnv.data.WHATSAPP_API_KEY,
  whatsappApiUrl: parsedEnv.data.WHATSAPP_API_URL,
  whatsappOrdersGroup: parsedEnv.data.WHATSAPP_ORDERS_GROUP,
  whatsappContactsGroup: parsedEnv.data.WHATSAPP_CONTACTS_GROUP,
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isDevelopment: parsedEnv.data.NODE_ENV === 'development',
  isTest: parsedEnv.data.NODE_ENV === 'test',
} as const;

console.info('Environment validation passed.');
console.info(`- NODE_ENV: ${env.nodeEnv}`);
console.info(`- PORT: ${env.port}`);
console.info(`- DATABASE_URL: ${redactDatabaseUrl(env.databaseUrl)}`);
console.info(`- AWS_REGION: ${env.awsRegion}`);
console.info(`- AWS_S3_BUCKET: ${env.awsS3Bucket}`);
console.info(`- FRONTEND_URL: ${env.frontendUrl}`);
console.info(`- CORS_ORIGIN count: ${env.allowedOrigins.length}`);

export type Env = typeof env;
export { env };
export default env;