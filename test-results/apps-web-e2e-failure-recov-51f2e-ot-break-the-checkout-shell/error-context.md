# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\e2e\failure-recovery.spec.ts >> failure recovery >> slow responses do not break the checkout shell
- Location: apps\web\e2e\failure-recovery.spec.ts:10:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/products", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from './fixtures/test';
  2  | 
  3  | test.describe('failure recovery', () => {
  4  |   test('api downtime shows graceful recovery', async ({ page }) => {
  5  |     await page.route('**/api/**', (route) => route.abort('failed'));
  6  |     await page.goto('/products').catch(() => undefined);
  7  |     await expect(page.getByText(/failed to load products|discover our complete collection/i)).toBeVisible({ timeout: 20_000 });
  8  |   });
  9  | 
  10 |   test('slow responses do not break the checkout shell', async ({ page }) => {
  11 |     await page.route('**/api/products/**', async (route) => {
  12 |       await new Promise((resolve) => setTimeout(resolve, 2000));
  13 |       await route.continue();
  14 |     });
> 15 |     await page.goto('/products');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  16 |     await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible({ timeout: 20_000 });
  17 |   });
  18 | 
  19 |   test('rollback safety is visible when admin updates fail', async ({ page, session }) => {
  20 |     await session.loginAdminApi();
  21 |     await page.route('**/api/orders/**/status', (route) => route.abort('failed'));
  22 |     await page.goto('/admin/orders');
  23 |     await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();
  24 |   });
  25 | });
```