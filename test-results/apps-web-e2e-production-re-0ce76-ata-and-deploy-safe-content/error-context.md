# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\e2e\production-readiness.spec.ts >> production readiness >> critical pages expose metadata and deploy-safe content
- Location: apps\web\e2e\production-readiness.spec.ts:4:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from './fixtures/test';
  2  | 
  3  | test.describe('production readiness', () => {
  4  |   test('critical pages expose metadata and deploy-safe content', async ({ page }) => {
> 5  |     await page.goto('/');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6  |     await expect(page).toHaveTitle(/RoboHatch/i);
  7  | 
  8  |     await page.goto('/products');
  9  |     await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();
  10 | 
  11 |     await page.goto('/privacy');
  12 |     await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toBeVisible();
  13 |   });
  14 | });
```