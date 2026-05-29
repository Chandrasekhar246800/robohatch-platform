import { test, expect } from '@playwright/test';

test.use({ trace: 'on', video: 'on' });

test('auth cookie reproducer - login then profile', async ({ page }) => {
  test.setTimeout(180_000);
  const email = process.env.E2E_TEST_USER_EMAIL || 'e2e.customer@robohatch.local';
  const password = process.env.E2E_TEST_USER_PASSWORD || 'E2E_test_pass_2026!';

  page.on('console', (message) => {
    console.log(`[repro][browser:${message.type()}]`, message.text());
  });

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      console.log('[repro] frame navigated:', frame.url());
    }
  });

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/auth/login') || url.includes('/api/auth/profile') || url.includes('/api/auth/refresh') || url.includes('/api/auth/csrf')) {
      console.log('[repro] response:', response.status(), url);
    }
  });

  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('/api/auth/')) {
      console.log('[repro] request failed:', request.method(), url, request.failure()?.errorText);
    }
  });

  const authState = async (label: string) => {
    const state = await page.evaluate(() => (window as any).__E2E_AUTH_STATE__ ?? null).catch(() => null);
    console.log(`[repro] auth state ${label}:`, state);
  };

  // Intercept and log outgoing /api/auth/profile request headers
  page.on('request', (req) => {
    if (req.url().includes('/api/auth/')) {
      console.log('[repro] outgoing profile request headers:', req.headers());
    }
  });

  // Go to login page and perform UI login
  const loginUrl = '/login';
  await page.goto(loginUrl);
  console.log('[repro] on page', page.url());
  await authState('after login page load');

  // Fill form (best-effort selectors used in LoginForm)
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  const loginStart = Date.now();
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20_000 }).catch((error) => {
      console.log('[repro] waitForURL timed out:', error.message);
      throw error;
    }),
    page.click('button[data-testid="login-submit"]'),
  ]);

  console.log('[repro] after login navigation url:', page.url(), 'elapsedMs=', Date.now() - loginStart);
  await authState('after login redirect');

  // Print browser cookies for the current context
  const cookies = await page.context().cookies();
  console.log('[repro] cookies:', cookies.map(c => ({ name: c.name, domain: c.domain, path: c.path, sameSite: c.sameSite, secure: c.secure, httpOnly: c.httpOnly })));

  // Confirm auth_token/refresh_token/csrf_token presence
  const authCookie = cookies.find(c => c.name === 'auth_token');
  const refreshCookie = cookies.find(c => c.name === 'refresh_token');
  const csrfCookie = cookies.find(c => c.name === 'csrf_token');

  console.log('[repro] auth_token present:', !!authCookie);
  console.log('[repro] refresh_token present:', !!refreshCookie);
  console.log('[repro] csrf_token present:', !!csrfCookie);

  await authState('before profile fetch');

  // Fetch profile from within the page context so browser cookies are used
  const profileResponse = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/auth/profile', { method: 'GET', credentials: 'include' });
      const text = await res.text();
      return { status: res.status, body: text };
    } catch (err: any) {
      return { status: 0, body: String(err) };
    }
  });

  console.log('[repro] profile request result:', profileResponse);
  await authState('after profile fetch');

  // Basic assertion to fail the test if profile not 200
  expect(profileResponse.status).toBe(200);
});
