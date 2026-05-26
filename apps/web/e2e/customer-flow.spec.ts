import { expect, test } from './fixtures/test';
import { E2E_STABLE_PRODUCT_ID, E2E_STABLE_PRODUCT_NAME } from './helpers/stable-product';

test.describe('customer flows', () => {
  test('login, browse, filter, and open an account page', async ({ page, session }) => {
    await session.loginCustomerUi();
    await page.goto('/account');
    await session.waitForHydratedAccount();
    await expect(page.getByRole('heading', { name: /my account/i })).toBeVisible();

    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();
    await expect(page.getByText(/discover our complete collection/i)).toBeVisible();
  });

  test('product browsing and search remain functional', async ({ page, session }) => {
    await page.goto('/products?search=' + encodeURIComponent(E2E_STABLE_PRODUCT_NAME));
    await expect(page.getByRole('heading', { name: /search results/i })).toBeVisible();
    await expect(page.getByText(E2E_STABLE_PRODUCT_NAME)).toBeVisible();

    await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
    await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible();
  });

  test('add to cart, checkout, and address capture', async ({ page, session }) => {
    await session.loginCustomerApi();
    await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
    await page.getByRole('button', { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/cart/);
    await page.getByRole('button', { name: /checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout\/address/);

    await page.getByLabel(/full name/i).fill('Robo Hatch QA');
    await page.getByLabel(/phone number/i).fill('9876543210');
    await page.getByLabel(/email address/i).fill('qa.customer@robohatch.test');
    await page.getByLabel(/street address/i).fill('742 Test Street');
    await page.getByLabel(/city/i).fill('Chennai');
    await page.getByLabel(/state/i).fill('Tamil Nadu');
    await page.getByLabel(/pincode/i).fill('600001');
    await page.getByRole('button', { name: /continue to payment/i }).click();
    await expect(page).toHaveURL(/\/checkout\/payment/);
    await expect(page.getByRole('button', { name: /pay ₹/i })).toBeVisible();
  });

  test('upload-design validates the upload form and backend path', async ({ page, session }) => {
    await session.loginCustomerApi();
    await page.goto('/upload-3d-file');
    await expect(page.getByRole('heading', { name: /upload/i })).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/click to upload/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('e2e/fixtures/sample.stl');

    await page.getByLabel(/design name/i).fill('QA Sample Part');
    await page.getByRole('button', { name: /upload|analyze/i }).click();
    await expect(page.getByText(/mesh analysis complete|failed to upload/i)).toBeVisible({ timeout: 60_000 });
  });
});