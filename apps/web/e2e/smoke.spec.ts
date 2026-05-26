import { test, expect } from './fixtures/test';
import { E2E_STABLE_PRODUCT_ID } from './helpers/stable-product';

test('smoke: homepage, navigation, and products are reachable', async ({ page, session }) => {
  await page.goto('/');
  await expect(page.getByText('Featured Products')).toBeVisible();
  await expect(page.getByRole('link', { name: /products/i }).first()).toBeVisible();

  await page.getByRole('link', { name: /view all categories/i }).click();
  await expect(page).toHaveURL(/\/products/);
  await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();

  await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
  await expect(page.getByRole('heading', { name: /e2e stable product/i })).toBeVisible();
});

test('smoke: login route is reachable', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  await expect(page.getByPlaceholder('••••••••')).toBeVisible();
});