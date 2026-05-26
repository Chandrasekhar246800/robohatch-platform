import { expect, test } from './fixtures/test';
import { E2E_STABLE_PRODUCT_ID } from './helpers/stable-product';

test.describe('mobile ecommerce validation', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });

  test('mobile homepage and product flow remain usable', async ({ page, session }) => {
    await page.goto('/');
    await expect(page.getByText(/shop by category/i)).toBeVisible();

    await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
    await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible();
    await expect(page.getByText(/secure checkout/i)).toBeVisible();
  });

  test('mobile admin cockpit exposes fast actions', async ({ page, session }) => {
    await session.loginAdminApi();
    await page.goto('/admin');
    await expect(page.getByText(/what needs attention today/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /review orders/i })).toBeVisible();
  });
});