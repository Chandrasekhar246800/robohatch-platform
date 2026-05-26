import { test as base, expect } from '@playwright/test';
import { e2eEnv } from '../helpers/env';
import { loginViaApi, loginViaUi, registerViaApi } from '../helpers/auth';
import {
  completePaymentWithVerification,
  installRazorpayMock,
  sendSignedWebhook,
  signRazorpayVerification,
  signRazorpayWebhook,
} from '../helpers/payment';
import { fetchProductByName, fetchProducts, pickPrimaryProduct, waitForHydratedAccount, fetchProductById } from '../helpers/data';
import { E2E_STABLE_PRODUCT_ID, getStableProduct } from '../helpers/stable-product';

export const test = base.extend<{
  session: {
    env: typeof e2eEnv;
    loginCustomerApi: () => Promise<void>;
    loginCustomerUi: () => Promise<void>;
    loginAdminApi: () => Promise<void>;
    registerCustomer: (name: string, email: string, password: string) => Promise<void>;
    installRazorpayMock: typeof installRazorpayMock;
    completePaymentWithVerification: typeof completePaymentWithVerification;
    fetchProducts: typeof fetchProducts;
    fetchProductByName: typeof fetchProductByName;
    pickPrimaryProduct: typeof pickPrimaryProduct;
    stableProductId: string;
    stableProduct: { id: string; name: string };
    waitForHydratedAccount: typeof waitForHydratedAccount;
    sendSignedWebhook: typeof sendSignedWebhook;
    signRazorpayVerification: typeof signRazorpayVerification;
    signRazorpayWebhook: typeof signRazorpayWebhook;
  };
}>({
  session: async ({ page }, use) => {
    await use({
      env: e2eEnv,
      loginCustomerApi: async () => {
        if (!e2eEnv.customerEmail || !e2eEnv.customerPassword) {
          throw new Error('Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD');
        }
        await loginViaApi(page, {
          email: e2eEnv.customerEmail,
          password: e2eEnv.customerPassword,
        });
      },
      loginCustomerUi: async () => {
        if (!e2eEnv.customerEmail || !e2eEnv.customerPassword) {
          throw new Error('Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD');
        }
        await loginViaUi(page, {
          email: e2eEnv.customerEmail,
          password: e2eEnv.customerPassword,
        });
      },
      loginAdminApi: async () => {
        if (!e2eEnv.adminEmail || !e2eEnv.adminPassword) {
          throw new Error('Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
        }
        await loginViaApi(page, {
          email: e2eEnv.adminEmail,
          password: e2eEnv.adminPassword,
        });
      },
      registerCustomer: async (name: string, email: string, password: string) => {
        await registerViaApi(page, { name, email, password });
      },
      installRazorpayMock,
      completePaymentWithVerification,
      fetchProducts: () => fetchProducts(page.request),
      fetchProductByName: (query: string) => fetchProductByName(page.request, query),
      fetchProductById: (id: string) => fetchProductById(page.request, id),
      pickPrimaryProduct,
      stableProductId: E2E_STABLE_PRODUCT_ID,
      stableProduct: getStableProduct(),
      waitForHydratedAccount: () => waitForHydratedAccount(page),
      sendSignedWebhook: (body, eventId) => sendSignedWebhook(page.request, body, eventId),
      signRazorpayVerification,
      signRazorpayWebhook,
    });
  },
});

export { expect };

// Global test hooks for visual stability
test.beforeEach(async ({ page }) => {
  // Disable animations/transitions
  await page.addStyleTag({ content: `
    *, *::before, *::after { transition: none !important; animation: none !important; }
    html, body { -webkit-font-smoothing: antialiased; }
  ` });

  await page.addInitScript(() => {
    Object.defineProperty(window, '__E2E_STABLE_PRODUCT_ID__', {
      value: '9d39b839-441d-4e8a-b18e-8e49518ee839',
      configurable: true,
    });

    localStorage.setItem(
      'robohatch-cookie-consent',
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        timestamp: new Date().toISOString(),
      })
    );
    document.cookie = 'consent-given=true; path=/; max-age=31536000; SameSite=Lax';
  });

  // Wait for initial network idle
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch {}

  // Dismiss the cookie banner when present so screenshots and layout assertions stay stable.
  try {
    const acceptCookies = page.getByRole('button', { name: /accept all cookies/i });
    if (await acceptCookies.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptCookies.click();
    }
  } catch {}

  // Ensure fonts and images are loaded where possible (best-effort)
  try {
    await page.evaluate(() => {
      const fontLoads = (document as any).fonts?.ready || Promise.resolve(true);
      const imgs = Array.from(document.images || []);
      const imgPromises = imgs.map((img) => (img.complete ? Promise.resolve(true) : new Promise((r) => { img.onload = img.onerror = () => r(true); })));
      return Promise.all([fontLoads, ...imgPromises]);
    });
  } catch {}
});