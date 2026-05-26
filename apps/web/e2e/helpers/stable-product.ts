const DEFAULT_STABLE_PRODUCT_ID = '9d39b839-441d-4e8a-b18e-8e49518ee839';

export const E2E_STABLE_PRODUCT_ID = process.env.E2E_STABLE_PRODUCT_ID?.trim() || DEFAULT_STABLE_PRODUCT_ID;
export const E2E_STABLE_PRODUCT_NAME = 'E2E Stable Product';

export function getStableProduct() {
  return {
    id: E2E_STABLE_PRODUCT_ID,
    name: E2E_STABLE_PRODUCT_NAME,
  };
}