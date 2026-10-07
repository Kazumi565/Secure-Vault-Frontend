import { defineConfig } from '@playwright/test';

const python = process.env.VAULT_TEST_PYTHON || 'python';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    ...(process.env.CHROMIUM_EXECUTABLE_PATH
      ? { launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } }
      : {}),
  },
  webServer: [
    {
      command: `"${python}" -m uvicorn tests.e2e_server:app --host 127.0.0.1 --port 8001 --no-access-log`,
      cwd: '..',
      url: 'http://127.0.0.1:8001/healthz',
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm run start -- --port 3001',
      url: 'http://localhost:3001',
      env: { VAULT_API_TARGET: 'http://127.0.0.1:8001' },
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
