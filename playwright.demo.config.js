import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-demo',
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:3002/Secure-Vault-Frontend/',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    ...(process.env.CHROMIUM_EXECUTABLE_PATH
      ? { launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } }
      : {}),
  },
  webServer: {
    command: 'npm run build:demo && npm run preview:demo -- --port 3002',
    url: 'http://127.0.0.1:3002/Secure-Vault-Frontend/',
    env: { VAULT_DEMO_BASE: '/Secure-Vault-Frontend/' },
    reuseExistingServer: false,
    timeout: 60000,
  },
});
