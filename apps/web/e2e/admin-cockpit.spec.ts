import { expect, test } from './fixtures/test';

test.describe('admin and founder cockpit', () => {
  test('admin login and cockpit render', async ({ page, session }) => {
    await session.loginAdminApi();
    await page.goto('/admin');
    await expect(page.getByText(/founder execution cockpit/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /review orders/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add product/i })).toBeVisible();
  });

  test('queue actions and optimistic order updates are available', async ({ page, session }) => {
    await session.loginAdminApi();
    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();

    const orderRow = page.locator('div').filter({ hasText: /Order #/ }).first();
    await expect(orderRow).toBeVisible({ timeout: 20_000 });
    await expect(orderRow.getByTitle('Mark Paid')).toBeVisible();
    await expect(orderRow.getByTitle('Mark Shipped')).toBeVisible();
    await expect(orderRow.getByTitle('Mark Delivered')).toBeVisible();
    await expect(orderRow.getByTitle('Cancel')).toBeVisible();
  });

  test('bulk toolbar and selection remain wired', async ({ page, session }) => {
    await session.loginAdminApi();
    await page.goto('/admin/orders');
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();
    await expect(page.getByText(/selected/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
  });
});