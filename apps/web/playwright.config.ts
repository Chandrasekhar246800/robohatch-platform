import dotenv from 'dotenv';
import path from 'path';
import { defineConfig, devices } from '@playwright/test';

// Load deterministic E2E env from the same directory as this config file.
// Do not override variables already provided by the CI environment.
dotenv.config({ path: path.resolve(__dirname, '.env.e2e'), override: false });

// mark that env was loaded for downstream processes/workers
process.env.E2E_ENV_LOADED = process.env.E2E_ENV_LOADED ?? '1';

const resolveEnv = (name: string) => {
  const v = process.env[name];
  if (!v) return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
};

const baseURL = resolveEnv('PLAYWRIGHT_BASE_URL') ?? resolveEnv('E2E_BASE_URL') ?? 'http://127.0.0.1:3000';
const shouldStartWebServer = !resolveEnv('PLAYWRIGHT_BASE_URL') && !resolveEnv('E2E_BASE_URL');

export default defineConfig({
  globalSetup: require.resolve('./e2e/global-setup'),
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testMatch: /.*mobile\.spec\.ts/,
    },
  ],
  webServer: shouldStartWebServer
    ? {
        command: process.env.CI ? 'npm run start' : 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : undefined,
});