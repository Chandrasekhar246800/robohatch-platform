import fs from 'fs';
import path from 'path';
import { e2eEnv } from './helpers/env';
import { E2E_STABLE_PRODUCT_ID } from './helpers/stable-product';

const DIAG_PATH = path.resolve(__dirname, '../test-results/ci-infra-diagnostics.json');

function now() {
  return new Date().toISOString();
}

async function fetchWithTimeout(url: string, opts: any = {}, ms = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, ...opts });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function runChecks() {
  const diag: any = {
    timestamp: now(),
    baseURL: e2eEnv.baseURL,
    apiBaseURL: e2eEnv.apiBaseURL,
    checks: {},
  };

  // 1) Web storefront reachability
  try {
    const url = e2eEnv.baseURL;
    const res = await fetchWithTimeout(url, { method: 'GET' }, 5000);
    diag.checks.web = { url, status: res.status };
    if (res.status >= 500 || res.status === 404) {
      throw new Error(`CI-INFRA: Web unreachable or server error (${res.status})`);
    }
  } catch (err: any) {
    diag.checks.web = { error: String(err) };
    throw new Error(`CI-INFRA: Web base URL check failed: ${err.message || err}`);
  }

  // 2) API health endpoint (prefer /api/health then /health)
  let apiHealthOk = false;
  const healthCandidates = [`${e2eEnv.apiBaseURL}/api/health`, `${e2eEnv.apiBaseURL}/health`].filter(Boolean);
  for (const h of healthCandidates) {
    try {
      const res = await fetchWithTimeout(h, { method: 'GET' }, 4000);
      diag.checks.apiHealth = diag.checks.apiHealth || [];
      diag.checks.apiHealth.push({ url: h, status: res.status });
      if (res.ok) { apiHealthOk = true; break; }
    } catch (err) {
      diag.checks.apiHealth = diag.checks.apiHealth || [];
      diag.checks.apiHealth.push({ url: h, error: String(err) });
    }
  }
  if (!apiHealthOk) {
    throw new Error('CI-INFRA: API health endpoint failed (no 200 OK)');
  }

  // 3) Auth refresh endpoint presence
  try {
    const url = `${e2eEnv.apiBaseURL.replace(/\/$/, '')}/api/auth/refresh`;
    const res = await fetchWithTimeout(url, { method: 'POST' }, 4000);
    diag.checks.authRefresh = { url, status: res.status };
    // Accept 200 or 401 as "endpoint available". Fail on 404/5xx.
    if (!(res.status === 200 || res.status === 401)) {
      throw new Error(`Auth refresh endpoint returned unexpected status ${res.status}`);
    }
  } catch (err: any) {
    diag.checks.authRefresh = diag.checks.authRefresh || { error: String(err) };
    throw new Error(`CI-INFRA: Auth refresh endpoint failed: ${err.message || err}`);
  }

  // 4) Seed verification - deterministic product must exist
  try {
    const productUrl = `${e2eEnv.apiBaseURL.replace(/\/$/, '')}/api/products/${encodeURIComponent(E2E_STABLE_PRODUCT_ID)}`;
    const res = await fetchWithTimeout(productUrl, { method: 'GET' }, 5000);
    diag.checks.seedProduct = { url: productUrl, status: res.status };
    if (!res.ok) {
      throw new Error(`Seeded product not available (status ${res.status})`);
    }
    const body = await res.json().catch(() => null);
    // Basic shape detection: expect an object (API uses { success, data } or similar)
    const found = body && (body.data || body.product || body.id || body.success);
    if (!found) {
      diag.checks.seedProduct.body = body;
      throw new Error('Seeded product response malformed or empty');
    }
  } catch (err: any) {
    diag.checks.seedProduct = diag.checks.seedProduct || { error: String(err) };
    throw new Error(`CI-INFRA: Seed verification failed: ${err.message || err}`);
  }

  // 5) DB availability: implicit via product + health; add a lightweight check to products/all
  try {
    const url = `${e2eEnv.apiBaseURL.replace(/\/$/, '')}/api/products/all`;
    const res = await fetchWithTimeout(url, { method: 'GET' }, 5000);
    diag.checks.productsAll = { url, status: res.status };
    if (!res.ok) throw new Error(`products/all returned ${res.status}`);
    const body = await res.json().catch(() => null);
    if (!body || !Array.isArray(body.data || body)) {
      diag.checks.productsAll.body = body;
      throw new Error('products/all did not return an array, DB may be unavailable');
    }
  } catch (err: any) {
    diag.checks.productsAll = diag.checks.productsAll || { error: String(err) };
    throw new Error(`CI-INFRA: DB availability check failed: ${err.message || err}`);
  }

  // success
  diag.result = 'ok';
  return diag;
}

export default async function globalSetup() {
  const out: any = { start: now(), status: 'running' };
  try {
    const diag = await runChecks();
    out.status = 'ok';
    out.diag = diag;
    fs.mkdirSync(path.dirname(DIAG_PATH), { recursive: true });
    fs.writeFileSync(DIAG_PATH, JSON.stringify(out, null, 2));
    console.log('CI-INFRA: Pre-test checks passed');
    console.log(JSON.stringify(diag, null, 2));
  } catch (err: any) {
    out.status = 'failed';
    out.error = String(err.message || err);
    out.end = now();
    fs.mkdirSync(path.dirname(DIAG_PATH), { recursive: true });
    fs.writeFileSync(DIAG_PATH, JSON.stringify(out, null, 2));
    console.error('CI-INFRA: Pre-test checks failed — aborting test run');
    console.error(out.error);
    throw new Error(out.error);
  }
}
