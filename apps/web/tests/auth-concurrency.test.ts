import assert from 'node:assert/strict';
import test from 'node:test';

import { apiClient, AuthenticationError } from '../src/lib/api-client';
import { clearCsrfTokenMemory, getCsrfTokenMemory, setCsrfTokenMemory } from '../src/lib/csrf-token';
import { useAuthStore } from '../src/store/auth.store';

type FetchCall = {
  url: string;
  method: string;
  csrfToken: string | null;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

const getHeaderValue = (init?: RequestInit, name?: string): string | null => {
  if (!init?.headers || !name) {
    return null;
  }

  const headers = new Headers(init.headers);
  return headers.get(name);
};

const resetClientState = () => {
  clearCsrfTokenMemory();
  useAuthStore.getState().logout();
};

test('refresh mutex: 20 simultaneous 401s share one refresh and retry once', async () => {
  resetClientState();

  const originalFetch = global.fetch;
  const calls: FetchCall[] = [];
  let cartCalls = 0;
  let refreshCalls = 0;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({
      url,
      method,
      csrfToken: getHeaderValue(init, 'x-csrf-token'),
    });

    if (url.endsWith('/api/cart')) {
      cartCalls += 1;
      if (cartCalls <= 20) {
        return jsonResponse({ success: false, message: 'Session expired' }, 401);
      }

      return jsonResponse({ success: true, data: { items: [] } });
    }

    if (url.endsWith('/api/auth/refresh')) {
      refreshCalls += 1;
      await sleep(10);
      return jsonResponse({
        success: true,
        message: 'Session refreshed',
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User',
            role: 'USER',
          },
          csrfToken: 'fresh-csrf-token',
        },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const results = await Promise.all(Array.from({ length: 20 }, () => apiClient.getCart()));

    assert.equal(refreshCalls, 1);
    assert.equal(cartCalls, 40);
    assert.equal(results.length, 20);
    assert.equal(getCsrfTokenMemory(), 'fresh-csrf-token');
    assert.ok(calls.filter((call) => call.url.endsWith('/api/auth/refresh')).length === 1);
  } finally {
    global.fetch = originalFetch;
    resetClientState();
  }
});

test('refresh mutex: failed refresh rejects all queued requests', async () => {
  resetClientState();

  const originalFetch = global.fetch;
  let cartCalls = 0;
  let refreshCalls = 0;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/api/cart')) {
      cartCalls += 1;
      return jsonResponse({ success: false, message: 'Session expired' }, 401);
    }

    if (url.endsWith('/api/auth/refresh')) {
      refreshCalls += 1;
      return jsonResponse({ success: false, message: 'Invalid or expired refresh token' }, 401);
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => apiClient.getCart()));

    assert.equal(refreshCalls, 1);
    assert.equal(cartCalls, 20);
    assert.ok(results.every((result) => result.status === 'rejected'));
    assert.ok(results[0].status === 'rejected' && results[0].reason instanceof AuthenticationError);
  } finally {
    global.fetch = originalFetch;
    resetClientState();
  }
});

test('refresh mutex: logout during refresh prevents stale session restoration', async () => {
  resetClientState();

  const originalFetch = global.fetch;
  let cartCalls = 0;
  let refreshCalls = 0;
  let releaseRefresh!: () => void;
  const refreshStarted = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.endsWith('/api/cart')) {
      cartCalls += 1;
      return jsonResponse({ success: false, message: 'Session expired' }, 401);
    }

    if (url.endsWith('/api/auth/refresh')) {
      refreshCalls += 1;
      await refreshStarted;
      return jsonResponse({
        success: true,
        message: 'Session refreshed',
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User',
            role: 'USER',
          },
          csrfToken: 'stale-after-logout',
        },
      });
    }

    if (url.endsWith('/api/auth/logout')) {
      return jsonResponse({ success: true, message: 'Logged out' });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const request = apiClient.getCart();

    while (refreshCalls === 0) {
      await sleep(1);
    }

    await apiClient.logout();
    releaseRefresh();

    await assert.rejects(request, AuthenticationError);
    assert.equal(cartCalls, 1);
    assert.equal(useAuthStore.getState().isAuthenticated, false);
  } finally {
    global.fetch = originalFetch;
    resetClientState();
  }
});

test('csrf concurrency: 20 invalid-CSRF failures share one bootstrap and retry once', async () => {
  resetClientState();
  setCsrfTokenMemory('stale-csrf-token');

  const originalFetch = global.fetch;
  let csrfCalls = 0;
  let mutationCalls = 0;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const csrfToken = getHeaderValue(init, 'x-csrf-token');

    if (url.endsWith('/api/auth/csrf')) {
      csrfCalls += 1;
      await sleep(10);
      return jsonResponse({
        success: true,
        data: { csrfToken: 'fresh-csrf-token' },
      });
    }

    if (url.endsWith('/api/cart/items')) {
      mutationCalls += 1;
      if (mutationCalls <= 20) {
        assert.equal(csrfToken, 'stale-csrf-token');
        return jsonResponse({ success: false, message: 'Invalid CSRF token' }, 403);
      }

      assert.equal(csrfToken, 'fresh-csrf-token');
      return jsonResponse({ success: true, data: { added: true } });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      apiClient.addToCart(`product-${index + 1}`)
    ));

    assert.equal(csrfCalls, 1);
    assert.equal(mutationCalls, 40);
    assert.equal(getCsrfTokenMemory(), 'fresh-csrf-token');
    assert.equal(results.length, 20);
  } finally {
    global.fetch = originalFetch;
    resetClientState();
  }
});

test('csrf concurrency: bootstrap failure fails safely without retry amplification', async () => {
  resetClientState();
  setCsrfTokenMemory('stale-csrf-token');

  const originalFetch = global.fetch;
  let csrfCalls = 0;
  let mutationCalls = 0;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.endsWith('/api/auth/csrf')) {
      csrfCalls += 1;
      return jsonResponse({ success: false, message: 'CSRF service unavailable' }, 500);
    }

    if (url.endsWith('/api/cart/items')) {
      mutationCalls += 1;
      return jsonResponse({ success: false, message: 'Invalid CSRF token' }, 403);
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, index) =>
      apiClient.addToCart(`product-${index + 1}`)
    ));

    assert.equal(csrfCalls, 1);
    assert.equal(mutationCalls, 20);
    assert.ok(results.every((result) => result.status === 'rejected'));
  } finally {
    global.fetch = originalFetch;
    resetClientState();
  }
});