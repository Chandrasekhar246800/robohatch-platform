# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\e2e\mobile.spec.ts >> mobile ecommerce validation >> mobile homepage and product flow remain usable
- Location: apps\web\e2e\mobile.spec.ts:7:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from './fixtures/test';
  2  | import { E2E_STABLE_PRODUCT_ID } from './helpers/stable-product';
  3  | 
  4  | test.describe('mobile ecommerce validation', () => {
  5  |   test.use({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
  6  | 
  7  |   test('mobile homepage and product flow remain usable', async ({ page, session }) => {
> 8  |     await page.goto('/');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  9  |     await expect(page.getByText(/shop by category/i)).toBeVisible();
  10 | 
  11 |     await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
  12 |     await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible();
  13 |     await expect(page.getByText(/secure checkout/i)).toBeVisible();
  14 |   });
  15 | 
  16 |   test('mobile admin cockpit exposes fast actions', async ({ page, session }) => {
  17 |     await session.loginAdminApi();
  18 |     await page.goto('/admin');
  19 |     await expect(page.getByText(/what needs attention today/i)).toBeVisible();
  20 |     await expect(page.getByRole('button', { name: /review orders/i })).toBeVisible();
  21 |   });
  22 | });
```