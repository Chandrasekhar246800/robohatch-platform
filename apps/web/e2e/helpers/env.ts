export type E2EEnv = {
  baseURL: string;
  apiBaseURL: string;
  customerEmail: string;
  customerPassword: string;
  adminEmail: string;
  adminPassword: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  allowSignup: boolean;
  paymentMode: 'mock' | 'live';
};

const readEnv = (name: string, fallback = '') => process.env[name]?.trim() || fallback;

export const e2eEnv: E2EEnv = {
  baseURL: readEnv('PLAYWRIGHT_BASE_URL', readEnv('E2E_BASE_URL', 'http://127.0.0.1:3000')),
  apiBaseURL: readEnv('E2E_API_BASE_URL', readEnv('NEXT_PUBLIC_API_URL', readEnv('API_BACKEND_URL'))),
  customerEmail: readEnv('E2E_TEST_USER_EMAIL'),
  customerPassword: readEnv('E2E_TEST_USER_PASSWORD'),
  adminEmail: readEnv('E2E_ADMIN_EMAIL'),
  adminPassword: readEnv('E2E_ADMIN_PASSWORD'),
  razorpayKeySecret: readEnv('E2E_RAZORPAY_KEY_SECRET', readEnv('RAZORPAY_KEY_SECRET')),
  razorpayWebhookSecret: readEnv('E2E_RAZORPAY_WEBHOOK_SECRET', readEnv('RAZORPAY_WEBHOOK_SECRET')),
  allowSignup: readEnv('E2E_ALLOW_SIGNUP', 'false') === 'true',
  paymentMode: (readEnv('E2E_PAYMENT_MODE', 'mock') as 'mock' | 'live'),
};

export const hasCustomerCreds = () => Boolean(e2eEnv.customerEmail && e2eEnv.customerPassword);
export const hasAdminCreds = () => Boolean(e2eEnv.adminEmail && e2eEnv.adminPassword);
export const hasPaymentSecrets = () => Boolean(e2eEnv.razorpayKeySecret && e2eEnv.razorpayWebhookSecret);