import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

type Credentials = {
  email: string;
  password: string;
};

export async function bootstrapCsrf(page: Page) {
  const response = await page.request.get('/api/auth/csrf');
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const csrfToken = payload?.data?.csrfToken || payload?.csrfToken;
  expect(typeof csrfToken).toBe('string');
  expect((csrfToken as string).length).toBeGreaterThan(0);
  return csrfToken as string;
}

export async function authedPost(page: Page, path: string, data: unknown) {
  const csrfToken = await bootstrapCsrf(page);
  return page.request.post(path, {
    data,
    headers: {
      'x-csrf-token': csrfToken,
    },
  });
}

export async function loginViaApi(page: Page, credentials: Credentials) {
  const response = await page.request.post('/api/auth/login', {
    data: credentials,
  });

  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  expect(payload.success).toBeTruthy();
  return payload;
}

export async function registerViaApi(page: Page, credentials: Credentials & { name: string }) {
  const response = await page.request.post('/api/auth/register', {
    data: credentials,
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function loginViaUi(page: Page, credentials: Credentials) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: /login/i }).click();
}

export async function logoutViaUi(page: Page) {
  await page.goto('/account');
  await page.getByRole('button', { name: /logout/i }).click().catch(() => undefined);
}