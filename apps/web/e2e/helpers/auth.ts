import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { e2eEnv } from './env';

type Credentials = {
  email: string;
  password: string;
};

export async function bootstrapCsrf(page: Page) {
  const response = await page.request.get(`${e2eEnv.apiBaseURL}/api/auth/csrf`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const csrfToken = payload?.data?.csrfToken || payload?.csrfToken;
  expect(typeof csrfToken).toBe('string');
  expect((csrfToken as string).length).toBeGreaterThan(0);
  return csrfToken as string;
}

export async function authedPost(page: Page, path: string, data: unknown) {
  const csrfToken = await bootstrapCsrf(page);
  return page.request.post(`${e2eEnv.apiBaseURL}${path}`, {
    data,
    headers: {
      'x-csrf-token': csrfToken,
    },
  });
}

export async function loginViaApi(page: Page, credentials: Credentials) {
  const response = await page.request.post(`${e2eEnv.apiBaseURL}/api/auth/login`, {
    data: credentials,
  });

  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  expect(payload.success).toBeTruthy();
  return payload;
}

export async function registerViaApi(page: Page, credentials: Credentials & { name: string }) {
  const response = await page.request.post(`${e2eEnv.apiBaseURL}/api/auth/register`, {
    data: credentials,
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function loginViaUi(page: Page, credentials: Credentials, redirectPath = '/') {
  console.log('[e2e][loginViaUi] start', { email: credentials.email, redirectPath });
  await page.goto(`/login?redirect=${encodeURIComponent(redirectPath)}`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(credentials.email);
  await page.getByTestId('login-password').fill(credentials.password);
  await page.getByTestId('login-submit').click();
  await page.waitForResponse((response) => response.request().method() === 'POST' && response.url().includes('/api/auth/login') && response.ok(), { timeout: 15_000 }).catch(() => undefined);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  console.log('[e2e][loginViaUi] login response received', { url: page.url() });
}

export async function logoutViaUi(page: Page) {
  await page.goto('/account', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /logout/i }).click().catch(() => undefined);
}