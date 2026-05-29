# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\e2e\cro-validation.spec.ts >> conversion flow reliability >> cart pricing hierarchy and inline validation remain clear
- Location: apps\web\e2e\cro-validation.spec.ts:177:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/product/9d39b839-441d-4e8a-b18e-8e49518ee839", waiting until "domcontentloaded"

```

# Test source

```ts
  1   | import { expect, test } from './fixtures/test';
  2   | import { E2E_STABLE_PRODUCT_ID, E2E_STABLE_PRODUCT_NAME, getStableProduct } from './helpers/stable-product';
  3   | import fs from 'fs';
  4   | import path from 'path';
  5   | 
  6   | async function selectPrimaryProduct() {
  7   |   return getStableProduct();
  8   | }
  9   | 
  10  | async function openStableProduct(page: any) {
> 11  |   await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  12  |   // Best-effort product fetch wait to reduce SSR/client race (non-fatal).
  13  |   try {
  14  |     await page.waitForResponse(
  15  |       (resp) => resp.url().includes(`/api/products/${E2E_STABLE_PRODUCT_ID}`),
  16  |       { timeout: 15000 }
  17  |     );
  18  |   } catch {}
  19  | 
  20  |   // State-aware client-ready gating:
  21  |   // 1) wait a short initial window for an explicit client-ready flag set by the app
  22  |   // 2) if not resolved, inspect the product API response to decide fail-fast vs continue
  23  |   const initialWaitMs = 5000;
  24  |   let readyObserved = false;
  25  |   try {
  26  |     await page.waitForFunction(() => (window as any).__E2E_PDP_READY__ === true, { timeout: initialWaitMs });
  27  |     readyObserved = true;
  28  |     console.log('[e2e] __E2E_PDP_READY__ observed within initial window');
  29  |   } catch (err) {
  30  |     console.log('[e2e] __E2E_PDP_READY__ NOT observed within initial window, inspecting product API response');
  31  |   }
  32  | 
  33  |   // If the flag wasn't observed, inspect the product API response to decide next steps.
  34  |   if (!readyObserved) {
  35  |     let resp = null as any;
  36  |     try {
  37  |       resp = await page.waitForResponse(
  38  |         (r) => r.url().includes(`/api/products/${E2E_STABLE_PRODUCT_ID}`),
  39  |         { timeout: 5000 }
  40  |       );
  41  |     } catch {}
  42  | 
  43  |     const resultsDir = path.join(process.cwd(), 'test-results');
  44  |     if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  45  |     const meta: any = { stableProductId: E2E_STABLE_PRODUCT_ID, timestamp: new Date().toISOString() };
  46  | 
  47  |     if (!resp) {
  48  |       meta.apiStatus = 'no-response-observed';
  49  |       meta.hydrationObserved = false;
  50  |       const metaPath = path.join(resultsDir, `pdp_${E2E_STABLE_PRODUCT_ID}_no_response.json`);
  51  |       fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  52  |       const shotPath = path.join(resultsDir, `pdp_${E2E_STABLE_PRODUCT_ID}_no_response.png`);
  53  |       await page.screenshot({ path: shotPath, fullPage: true }).catch(() => null);
  54  |       throw new Error(`[e2e][PDP] No product API response observed for ${E2E_STABLE_PRODUCT_ID}. Saved artifacts: ${metaPath}, ${shotPath}`);
  55  |     }
  56  | 
  57  |     meta.apiStatus = resp.status();
  58  |     meta.hydrationObserved = false;
  59  |     const metaPath = path.join(resultsDir, `pdp_${E2E_STABLE_PRODUCT_ID}_api_${resp.status()}.json`);
  60  |     fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  61  |     const shotPath = path.join(resultsDir, `pdp_${E2E_STABLE_PRODUCT_ID}_api_${resp.status()}.png`);
  62  |     await page.screenshot({ path: shotPath, fullPage: true }).catch(() => null);
  63  | 
  64  |     // If API returned 404 -> fail fast with clear artifacts and message.
  65  |     if (resp.status() === 404) {
  66  |       // Capture whether 'Product Not Found' is visible to help triage.
  67  |       const isProductNotFound = await page.locator('text=Product Not Found').isVisible().catch(() => false);
  68  |       const extraPath = path.join(resultsDir, `pdp_${E2E_STABLE_PRODUCT_ID}_404_product_not_found_${isProductNotFound}.txt`);
  69  |       fs.writeFileSync(extraPath, `productNotFoundVisible: ${isProductNotFound}\n`);
  70  |       throw new Error(`[e2e][PDP] Product API returned 404 for ${E2E_STABLE_PRODUCT_ID}. Artifacts: ${metaPath}, ${shotPath}, ${extraPath}`);
  71  |     }
  72  | 
  73  |     // If API returned 200 but the flag wasn't set, log and continue to the deterministic assertions.
  74  |     if (resp.status() === 200) {
  75  |       console.log(`[e2e][PDP] Product API returned 200 for ${E2E_STABLE_PRODUCT_ID}; proceeding to locator assertions`);
  76  |     }
  77  |   } else {
  78  |     // hydration observed in initial window
  79  |     console.log('[e2e] proceeding to locator assertions after hydration signal');
  80  |   }
  81  | 
  82  |   // Immediate post-ready fail-fast capture: if the fallback UI is already visible,
  83  |   // capture deterministic artifacts and fail loudly for triage.
  84  |   try {
  85  |     const resultsDir = path.join(process.cwd(), 'test-results');
  86  |     if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  87  |     const fallbackVisible = await page.locator('text=Product Not Found').isVisible().catch(() => false);
  88  |     if (fallbackVisible) {
  89  |       const stamp = `${Date.now()}`;
  90  |       const shotPath = path.join(resultsDir, `pdp_${E2E_STABLE_PRODUCT_ID}_postready_${stamp}.png`);
  91  |       await page.screenshot({ path: shotPath, fullPage: true }).catch(() => null);
  92  |       const dom = await page.content();
  93  |       const domPath = path.join(resultsDir, `pdp_${E2E_STABLE_PRODUCT_ID}_postready_${stamp}.html`);
  94  |       fs.writeFileSync(domPath, dom);
  95  |       const resp = await page.evaluate(() => (window as any).__E2E_PDP_RESPONSE__ || null);
  96  |       const respPath = path.join(resultsDir, `pdp_${E2E_STABLE_PRODUCT_ID}_postready_${stamp}_resp.json`);
  97  |       fs.writeFileSync(respPath, JSON.stringify(resp, null, 2));
  98  |       const readyFlag = await page.evaluate(() => (window as any).__E2E_PDP_READY__ ?? null);
  99  |       const statePath = path.join(resultsDir, `pdp_${E2E_STABLE_PRODUCT_ID}_postready_${stamp}_state.json`);
  100 |       fs.writeFileSync(statePath, JSON.stringify({ readyFlag }, null, 2));
  101 |       const logs = await page.evaluate(() => (window as any).__E2E_CONSOLE_LOGS__ || []);
  102 |       const logsPath = path.join(resultsDir, `pdp_${E2E_STABLE_PRODUCT_ID}_postready_${stamp}_console.json`);
  103 |       fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
  104 |       throw new Error(`[e2e][PDP] Fallback visible after ready; artifacts: ${shotPath}, ${domPath}, ${respPath}, ${statePath}, ${logsPath}`);
  105 |     }
  106 |   } catch (err) {
  107 |     // If artifact capture failed, surface the original error so test can fail loudly.
  108 |     console.error('[e2e] post-ready artifact capture error', err);
  109 |   }
  110 | 
  111 |   // Final assertions: keep heading/trust-row/hydration centralized here.
```