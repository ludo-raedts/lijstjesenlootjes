import { defineConfig } from "@playwright/test";

const APP_PORT = 3100;
const TARGET_PORT = 3101;
const MOCK_PORT = 4010;

/**
 * End-to-end tests run against a production build wired to an in-memory Supabase stand-in
 * (e2e/mock-supabase.mjs). The environment below is passed explicitly, so a developer's
 * .env.local can never point the tests at a real database. All secrets are throwaway test values.
 */
export const E2E_ADMIN_PASSWORD = "e2e-test-admin-password";
export const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;

const serverEnv = {
  SUPABASE_URL: MOCK_URL,
  SUPABASE_SECRET_KEY: "e2e-test-supabase-secret-key-not-real",
  THEME_ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
  THEME_ADMIN_SESSION_SECRET: "e2e-test-session-secret-0123456789abcdef",
  CRON_SECRET: "e2e-test-cron-secret-0123456789abcdef",
  NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${APP_PORT}`,
  // Mail goes to the stand-in, which records it; nothing is ever sent to a real provider.
  EMAIL_PROVIDER_API_KEY: "re_e2e_not_real",
  EMAIL_FROM: "E2E <noreply@example.test>",
  EMAIL_API_URL: `${MOCK_URL}/emails`,
};

const hostRules = "MAP lijstjesenlootjes.nl 127.0.0.1, MAP wishanddraw.com 127.0.0.1";
const chromeArgs = [
  `--host-resolver-rules=${hostRules}`,
  "--disable-features=HttpsUpgrades,HttpsFirstBalancedModeAutoEnable",
  `--unsafely-treat-insecure-origin-as-secure=http://lijstjesenlootjes.nl:${APP_PORT},http://wishanddraw.com:${APP_PORT}`,
];

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    channel: "chrome",
    launchOptions: { args: chromeArgs },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "nl", use: { baseURL: `http://lijstjesenlootjes.nl:${APP_PORT}`, locale: "nl-NL" } },
    { name: "en", use: { baseURL: `http://wishanddraw.com:${APP_PORT}`, locale: "en-GB" } },
  ],
  webServer: [
    {
      command: "node e2e/mock-supabase.mjs",
      url: `${MOCK_URL}/__health`,
      reuseExistingServer: false,
      timeout: 15_000,
    },
    {
      command: `npx next build && npx next start -p ${TARGET_PORT}`,
      url: `http://127.0.0.1:${TARGET_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 300_000,
      env: serverEnv,
    },
    {
      command: "node e2e/proxy.mjs",
      url: `http://127.0.0.1:${APP_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 15_000,
      env: { E2E_PROXY_PORT: String(APP_PORT), E2E_TARGET_PORT: String(TARGET_PORT) },
    },
  ],
});
