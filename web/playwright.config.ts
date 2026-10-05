import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env['E2E_BASE_URL'] ?? 'https://tasteroute.vercel.app';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: 1,
  use: {
    baseURL: BASE_URL,
    // VM egress goes through an authenticated proxy Chromium can't parse directly;
    // the local forwarder on :8888 injects Proxy-Authorization (see AGENTS.md).
    proxy: { server: 'http://127.0.0.1:8888' },
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
