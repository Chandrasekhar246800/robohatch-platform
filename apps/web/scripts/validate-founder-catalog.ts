import fs from 'fs';
import path from 'path';
import { chromium, expect } from '@playwright/test';

const baseURL = 'http://localhost:3000';
const apiBaseURL = 'http://localhost:5000';

const fallbackAuth = {
  auth_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwNjBkZTE1MS1iNDE0LTRiMjYtYWNlNS1hM2UyYWQ1NjFjNTAiLCJlbWFpbCI6ImUyZS5hZG1pbkByb2JvaGF0Y2gubG9jYWwiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzk5ODk5MjgsImV4cCI6MTc3OTk5MDgyOH0.c8aCVPT0FAXGT2es96q_btP7JlbACiTtM4SJSKnIrRg',
  csrf_token: '701b4371ff03cdf370084a0fa94582a31749a97f45fc1b533d172ad3dd716a3b',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwNjBkZTE1MS1iNDE0LTRiMjYtYWNlNS1hM2UyYWQ1NjFjNTAiLCJlbWFpbCI6ImUyZS5hZG1pbkByb2JvaGF0Y2gubG9jYWwiLCJyb2xlIjoiQURNSU4iLCJ0b2tlblR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzc5OTg5OTI4LCJleHAiOjE3ODA1OTQ3Mjh9.hYso0dgQZWUe88Hea_5D3UDuB959_2HzyV507_x56js',
};

function parseSetCookieStrings(raw: string | string[]) {
  const arr = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(/, (?=[^ ;]+=)/) : []);
  const cookies: Record<string, string> = {};
  for (const c of arr) {
    const parts = c.split(';').map((s) => s.trim());
    const [nameVal] = parts;
    const eq = nameVal.indexOf('=');
    if (eq > -1) {
      const name = nameVal.slice(0, eq);
      const value = nameVal.slice(eq + 1);
      cookies[name] = value;
    }
  }
  return cookies;
}

function loadDumpedAuth(dumpPath?: string) {
  const candidates = [
    dumpPath,
    path.resolve(__dirname, '../../api/backups/login-cookies.json'),
    path.resolve(__dirname, '../../api/backups/dump-login.json'),
    path.resolve(__dirname, '../../api/backups/login-dump.json'),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (!p) continue;
    try {
      if (!fs.existsSync(p)) continue;
      const content = fs.readFileSync(p, 'utf8');
      const parsed = JSON.parse(content);
      const rawCookies = parsed.cookies ?? parsed.rawCookies ?? parsed.setCookie ?? null;
      const parsedCookies = rawCookies ? parseSetCookieStrings(rawCookies) : {};
      const csrfToken = parsed?.body?.data?.csrfToken || parsed?.body?.csrfToken || parsed?.csrfToken || parsedCookies['csrf_token'];
      return {
        cookies: parsedCookies,
        csrfToken,
      };
    } catch (err) {
      // try next
    }
  }
  return null;
}

async function main() {
  console.log('step: launch browser');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL });
  console.log('step: seed cookies');

  const dumpPath = process.env.LOGIN_DUMP_PATH;
  const dumped = loadDumpedAuth(dumpPath) || {
    cookies: fallbackAuth,
    csrfToken: fallbackAuth.csrf_token,
  };

  if (!dumped) {
    console.error('No dumped login cookies found. Set LOGIN_DUMP_PATH or create apps/api/backups/login-cookies.json by running the dump script.');
    await browser.close();
    process.exitCode = 2;
    return;
  }

  const adminCookies = [] as any[];
  const cookieNames = Object.keys(dumped.cookies);
  for (const name of cookieNames) {
    const value = dumped.cookies[name];
    adminCookies.push({
      name,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    });
  }

  // If CSRF token exists separately in body, add it as non-httpOnly cookie too (helps some flows)
  if (dumped.csrfToken) {
    adminCookies.push({
      name: 'csrf_token',
      value: dumped.csrfToken,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
      secure: false,
    });
  }

  await context.addCookies(adminCookies);

  const page = await context.newPage();
  const stamp = Date.now();
  const categoryName = `Founder Validation Category ${stamp}`;
  const productName = `Founder Validation Product ${stamp}`;
  const productDescription = 'Validation product created through the admin portal after catalog reset.';
  const imagePath = path.resolve(__dirname, '../public/logo.jpeg');

  console.log('step: open app origin');
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

  console.log('step: verify storefront empty state');
  const emptyCheck = await page.evaluate(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('http://localhost:5000/api/products/all', { credentials: 'include' }).catch(() => null),
        fetch('http://localhost:5000/api/categories', { credentials: 'include' }).catch(() => null),
      ]);
      const products = pRes ? await pRes.json().catch(() => null) : null;
      const categories = cRes ? await cRes.json().catch(() => null) : null;
      return { products, categories };
    } catch (err) {
      return { error: String(err) };
    }
  });

  if (emptyCheck.error) {
    throw new Error(`Empty-state check failed: ${emptyCheck.error}`);
  }
  const productsArr = emptyCheck.products?.data ?? emptyCheck.products ?? [];
  const categoriesArr = emptyCheck.categories?.data ?? emptyCheck.categories ?? [];
  if ((productsArr.length || 0) > 0 || (categoriesArr.length || 0) > 0) {
    console.error('Storefront not empty — found counts', { products: productsArr.length, categories: categoriesArr.length });
    throw new Error('Storefront expected to be empty before founder creation. Run the safe reset first.');
  }

  console.log('step: create category via api');
  const categoryResult = await page.evaluate(async ({ categoryName, csrfToken }) => {
    let response = null as any;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      response = await fetch('http://localhost:5000/api/admin/categories', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ name: categoryName }),
      });
      if (response.status !== 429) {
        break;
      }
      const backoff = 1000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, backoff));
    }

    const body = await response.json().catch(() => null);
    const retryAfter = response.headers.get('retry-after');
    const rateLimitReset = response.headers.get('ratelimit-reset');
    return { status: response.status, body, retryAfter, rateLimitReset };
  }, { categoryName, csrfToken: dumped.csrfToken });

  console.log('category response', categoryResult);
  expect(categoryResult.status).toBe(200);
  if (!categoryResult.body?.success) {
    throw new Error(`Category create failed: ${JSON.stringify(categoryResult.body)}`);
  }

  console.log('step: fetch public categories');
  const categoriesPayload = await page.evaluate(async () => {
    const response = await fetch('http://localhost:5000/api/categories', { credentials: 'include' });
    return response.json();
  });
  const createdCategory = (categoriesPayload.data || []).find((category: any) => category.name === categoryName);
  if (!createdCategory) {
    throw new Error(`Created category not found: ${categoryName}`);
  }

  console.log('step: create product via api');
  const productPayload = await page.evaluate(async ({ productName, productDescription, categoryId, csrfToken }) => {
    const imageResponse = await fetch('http://localhost:3000/logo.jpeg');
    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], 'logo.jpeg', { type: imageBlob.type || 'image/jpeg' });

    const formData = new FormData();
    formData.append('name', productName);
    formData.append('description', productDescription);
    formData.append('price', '1299');
    formData.append('stock', '7');
    formData.append('categoryIds', JSON.stringify([categoryId]));
    formData.append('images', imageFile);

    let response = null as any;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      response = await fetch('http://localhost:5000/api/admin/products', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        body: formData,
      });
      if (response.status !== 429) {
        break;
      }
      const backoff = 1000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, backoff));
    }

    const body = await response.json().catch(() => null);
    const retryAfter = response.headers.get('retry-after');
    const rateLimitReset = response.headers.get('ratelimit-reset');
    return { status: response.status, body, retryAfter, rateLimitReset };
  }, {
    productName,
    productDescription,
    categoryId: createdCategory.id,
    csrfToken: dumped.csrfToken,
  });

  console.log('product response', productPayload);
  expect(productPayload.status).toBe(201);
  if (!productPayload.body || !productPayload.body.data || !productPayload.body.data.id) {
    throw new Error(`Unexpected product response: ${JSON.stringify(productPayload)}`);
  }

  const productId = productPayload.body.data.id as string;
  await expect(page.getByText(/product created successfully!/i)).toBeVisible();

  console.log('step: verify storefront');
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

  await page.getByTestId('product-add-to-cart').click();
  await expect(page).toHaveURL(/\/cart/);

  console.log(JSON.stringify({
    category: createdCategory,
    product: {
      id: productId,
      name: productName,
    },
    validated: true,
  }, null, 2));

  await browser.close();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});