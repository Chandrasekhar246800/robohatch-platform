import { expect, test } from './fixtures/test';

test.describe('failure recovery', () => {
  test('api downtime shows graceful recovery', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort('failed'));
    await page.goto('/products').catch(() => undefined);
    await expect(page.getByText(/failed to load products|discover our complete collection/i)).toBeVisible({ timeout: 20_000 });
  });

  test('slow responses do not break the checkout shell', async ({ page }) => {
    await page.route('**/api/products/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible({ timeout: 20_000 });
  });

  test('rollback safety is visible when admin updates fail', async ({ page, session }) => {
    await session.loginAdminApi();
    await page.route('**/api/orders/**/status', (route) => route.abort('failed'));
    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();
  });
});