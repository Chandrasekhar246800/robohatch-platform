import path from 'path';

import { expect, test } from './fixtures/test';

test.describe('founder catalog validation', () => {
  test('create one category and one product, then verify storefront visibility', async ({ page, session }) => {
    const stamp = Date.now();
    const categoryName = `Founder Validation Category ${stamp}`;
    const productName = `Founder Validation Product ${stamp}`;
    const productDescription = 'Validation product created through the admin portal after catalog reset.';
    const productPrice = '1299';
    const productStock = '7';
    const imagePath = path.resolve(__dirname, '../public/logo.jpeg');

    await session.loginAdminApi();

    await page.goto('/admin/categories', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /category management/i })).toBeVisible();
    await expect(page.getByText(/no categories yet/i)).toBeVisible();

    await page.getByPlaceholder(/enter category name/i).fill(categoryName);
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/admin/categories') && response.request().method() === 'POST'),
      page.getByRole('button', { name: /^add$/i }).click(),
    ]);

    await expect(page.getByText(/category created successfully!/i)).toBeVisible();

    const categoriesResponse = await page.request.get('/api/categories');
    expect(categoriesResponse.ok()).toBeTruthy();
    const categoriesPayload = await categoriesResponse.json();
    const createdCategory = (categoriesPayload.data || []).find((category: any) => category.name === categoryName);
    expect(createdCategory, 'created category should exist in public category list').toBeTruthy();

    await page.goto('/admin/products/add', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /add new product/i })).toBeVisible();
    await expect(page.getByText(/no categories available/i)).toHaveCount(0);

    await page.getByPlaceholder(/enter product name/i).fill(productName);
    await page.getByPlaceholder(/enter product description/i).fill(productDescription);
    await page.locator('input[name="price"]').fill(productPrice);
    await page.locator('input[name="stock"]').fill(productStock);
    await page.locator('label', { hasText: categoryName }).getByRole('checkbox').check();
    await page.locator('#images').setInputFiles(imagePath);

    const [createResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/admin/products') && response.request().method() === 'POST'),
      page.getByRole('button', { name: /create product/i }).click(),
    ]);

    expect(createResponse.ok()).toBeTruthy();
    const createPayload = await createResponse.json();
    expect(createPayload.success).toBeTruthy();
    const productId = createPayload.data.id as string;
    expect(productId).toBeTruthy();

    const productById = await session.fetchProductById(productId);
    expect(productById.success).toBeTruthy();
    expect(productById.data?.id).toBe(productId);
    expect(productById.data?.name).toBe(productName);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(productName)).toBeVisible();

    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(productName)).toBeVisible();

    await page.goto(`/products?search=${encodeURIComponent(productName)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(productName)).toBeVisible();

    await page.goto(`/products?category=${encodeURIComponent(createdCategory.id)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(productName)).toBeVisible();

    await page.goto(`/product/${productId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('product-detail-ready')).toBeVisible();
    await expect(page.getByTestId('product-add-to-cart')).toBeVisible();
    await expect(page.getByText(productName)).toBeVisible();
  });
});