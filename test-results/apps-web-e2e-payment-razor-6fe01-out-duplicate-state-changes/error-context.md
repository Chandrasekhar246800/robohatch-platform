# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\e2e\payment.spec.ts >> razorpay and payment flows >> webhook replay is suppressed without duplicate state changes
- Location: apps\web\e2e\payment.spec.ts:95:7

# Error details

```
TypeError: apiRequestContext.post: Invalid URL
```

# Test source

```ts
  1  | import type { Page } from '@playwright/test';
  2  | import { expect } from '@playwright/test';
  3  | 
  4  | type Credentials = {
  5  |   email: string;
  6  |   password: string;
  7  | };
  8  | 
  9  | export async function bootstrapCsrf(page: Page) {
  10 |   const response = await page.request.get('/api/auth/csrf');
  11 |   expect(response.ok()).toBeTruthy();
  12 | 
  13 |   const payload = await response.json();
  14 |   const csrfToken = payload?.data?.csrfToken || payload?.csrfToken;
  15 |   expect(typeof csrfToken).toBe('string');
  16 |   expect((csrfToken as string).length).toBeGreaterThan(0);
  17 |   return csrfToken as string;
  18 | }
  19 | 
  20 | export async function authedPost(page: Page, path: string, data: unknown) {
  21 |   const csrfToken = await bootstrapCsrf(page);
  22 |   return page.request.post(path, {
  23 |     data,
  24 |     headers: {
  25 |       'x-csrf-token': csrfToken,
  26 |     },
  27 |   });
  28 | }
  29 | 
  30 | export async function loginViaApi(page: Page, credentials: Credentials) {
> 31 |   const response = await page.request.post('/api/auth/login', {
     |                                       ^ TypeError: apiRequestContext.post: Invalid URL
  32 |     data: credentials,
  33 |   });
  34 | 
  35 |   expect(response.ok()).toBeTruthy();
  36 | 
  37 |   const payload = await response.json();
  38 |   expect(payload.success).toBeTruthy();
  39 |   return payload;
  40 | }
  41 | 
  42 | export async function registerViaApi(page: Page, credentials: Credentials & { name: string }) {
  43 |   const response = await page.request.post('/api/auth/register', {
  44 |     data: credentials,
  45 |   });
  46 | 
  47 |   expect(response.ok()).toBeTruthy();
  48 |   return response.json();
  49 | }
  50 | 
  51 | export async function loginViaUi(page: Page, credentials: Credentials) {
  52 |   await page.goto('/login');
  53 |   await page.getByLabel('Email Address').fill(credentials.email);
  54 |   await page.getByLabel('Password').fill(credentials.password);
  55 |   await page.getByRole('button', { name: /login/i }).click();
  56 | }
  57 | 
  58 | export async function logoutViaUi(page: Page) {
  59 |   await page.goto('/account');
  60 |   await page.getByRole('button', { name: /logout/i }).click().catch(() => undefined);
  61 | }
```