# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\e2e\customer-flow.spec.ts >> customer flows >> product browsing and search remain functional
- Location: apps\web\e2e\customer-flow.spec.ts:16:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/products?search=E2E%20Stable%20Product", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from './fixtures/test';
  2  | import { E2E_STABLE_PRODUCT_ID, E2E_STABLE_PRODUCT_NAME } from './helpers/stable-product';
  3  | 
  4  | test.describe('customer flows', () => {
  5  |   test('login, browse, filter, and open an account page', async ({ page, session }) => {
  6  |     await session.loginCustomerUi();
  7  |     await page.goto('/account');
  8  |     await session.waitForHydratedAccount();
  9  |     await expect(page.getByRole('heading', { name: /my account/i })).toBeVisible();
  10 | 
  11 |     await page.goto('/products');
  12 |     await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();
  13 |     await expect(page.getByText(/discover our complete collection/i)).toBeVisible();
  14 |   });
  15 | 
  16 |   test('product browsing and search remain functional', async ({ page, session }) => {
> 17 |     await page.goto('/products?search=' + encodeURIComponent(E2E_STABLE_PRODUCT_NAME));
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  18 |     await expect(page.getByRole('heading', { name: /search results/i })).toBeVisible();
  19 |     await expect(page.getByText(E2E_STABLE_PRODUCT_NAME)).toBeVisible();
  20 | 
  21 |     await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
  22 |     await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible();
  23 |   });
  24 | 
  25 |   test('add to cart, checkout, and address capture', async ({ page, session }) => {
  26 |     await session.loginCustomerApi();
  27 |     await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
  28 |     await page.getByRole('button', { name: /add to cart/i }).click();
  29 |     await expect(page).toHaveURL(/\/cart/);
  30 |     await page.getByRole('button', { name: /checkout/i }).click();
  31 |     await expect(page).toHaveURL(/\/checkout\/address/);
  32 | 
  33 |     await page.getByLabel(/full name/i).fill('Robo Hatch QA');
  34 |     await page.getByLabel(/phone number/i).fill('9876543210');
  35 |     await page.getByLabel(/email address/i).fill('qa.customer@robohatch.test');
  36 |     await page.getByLabel(/street address/i).fill('742 Test Street');
  37 |     await page.getByLabel(/city/i).fill('Chennai');
  38 |     await page.getByLabel(/state/i).fill('Tamil Nadu');
  39 |     await page.getByLabel(/pincode/i).fill('600001');
  40 |     await page.getByRole('button', { name: /continue to payment/i }).click();
  41 |     await expect(page).toHaveURL(/\/checkout\/payment/);
  42 |     await expect(page.getByRole('button', { name: /pay ₹/i })).toBeVisible();
  43 |   });
  44 | 
  45 |   test('upload-design validates the upload form and backend path', async ({ page, session }) => {
  46 |     await session.loginCustomerApi();
  47 |     await page.goto('/upload-3d-file');
  48 |     await expect(page.getByRole('heading', { name: /upload/i })).toBeVisible();
  49 | 
  50 |     const fileChooserPromise = page.waitForEvent('filechooser');
  51 |     await page.getByText(/click to upload/i).click();
  52 |     const fileChooser = await fileChooserPromise;
  53 |     await fileChooser.setFiles('e2e/fixtures/sample.stl');
  54 | 
  55 |     await page.getByLabel(/design name/i).fill('QA Sample Part');
  56 |     await page.getByRole('button', { name: /upload|analyze/i }).click();
  57 |     await expect(page.getByText(/mesh analysis complete|failed to upload/i)).toBeVisible({ timeout: 60_000 });
  58 |   });
  59 | });
```