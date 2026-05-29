# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\e2e\smoke.spec.ts >> smoke: login route is reachable
- Location: apps\web\e2e\smoke.spec.ts:17:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | import { test, expect } from './fixtures/test';
  2  | import { E2E_STABLE_PRODUCT_ID } from './helpers/stable-product';
  3  | 
  4  | test('smoke: homepage, navigation, and products are reachable', async ({ page, session }) => {
  5  |   await page.goto('/', { waitUntil: 'domcontentloaded' });
  6  |   await expect(page.getByText('Featured Products')).toBeVisible();
  7  |   await expect(page.getByRole('link', { name: /products/i }).first()).toBeVisible();
  8  | 
  9  |   await page.getByRole('link', { name: /view all categories/i }).click();
  10 |   await expect(page).toHaveURL(/\/products/);
  11 |   await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();
  12 | 
  13 |   await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`, { waitUntil: 'domcontentloaded' });
  14 |   await expect(page.getByRole('heading', { name: /e2e stable product/i })).toBeVisible();
  15 | });
  16 | 
  17 | test('smoke: login route is reachable', async ({ page }) => {
> 18 |   await page.goto('/login', { waitUntil: 'domcontentloaded' });
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  19 |   await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  20 |   await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  21 |   await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  22 | });
```