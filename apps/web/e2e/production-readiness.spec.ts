import { expect, test } from './fixtures/test';

test.describe('production readiness', () => {
  test('critical pages expose metadata and deploy-safe content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RoboHatch/i);

    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();

    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toBeVisible();
  });
});