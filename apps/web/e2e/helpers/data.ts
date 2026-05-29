import type { APIRequestContext, Page } from '@playwright/test';
import { E2E_STABLE_PRODUCT_ID, E2E_STABLE_PRODUCT_NAME, getStableProduct } from './stable-product';

export type CatalogProduct = {
  id: string;
  name: string;
  stock?: number;
  isActive?: boolean;
  category?: {
    id?: string;
    name?: string;
  };
  images?: Array<{ url: string }>;
};

export async function fetchProducts(request: APIRequestContext) {
  const response = await request.get('/api/products/all');
  const payload = await response.json();
  return (payload?.data || payload?.products || []) as CatalogProduct[];
}

export async function fetchProductById(request: APIRequestContext, id: string) {
  const response = await request.get(`/api/products/${encodeURIComponent(id)}`);
  const payload = await response.json();
  return payload?.data || payload || null;
}

export function pickPrimaryProduct(products: CatalogProduct[]): CatalogProduct | null {
  if (!Array.isArray(products) || products.length === 0) {
    return getStableProduct() as CatalogProduct;
  }

  const stable = products.find((product) => product.id === E2E_STABLE_PRODUCT_ID || product.name === E2E_STABLE_PRODUCT_NAME);
  return (stable ?? getStableProduct()) as CatalogProduct;
}

export async function fetchProductByName(request: APIRequestContext, query: string) {
  const response = await request.get(`/api/products/search?q=${encodeURIComponent(query)}`);
  const payload = await response.json();
  return (payload?.data || payload?.products || []) as CatalogProduct[];
}

export async function waitForHydratedAccount(page: Page) {
  await page.waitForFunction(() => {
    const state = (window as any).__E2E_AUTH_STATE__;
    return Boolean(state && state.status === 'authenticated' && state.hydrated && state.isAuthenticated);
  }, undefined, { timeout: 15_000 }).catch(() => undefined);

  await page.getByTestId('account-page-ready').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
}