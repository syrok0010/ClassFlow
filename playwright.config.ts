import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const isProdMode = process.env.E2E_MODE === "prod";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    timeout: 10_000,
  },
  globalSetup: "./tests/e2e/setup/global-setup.ts",
  webServer: {
    command: isProdMode ? "pnpm build && pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_E2E || process.env.DATABASE_URL || "",
      BETTER_AUTH_URL: "http://localhost:3000",
      DISABLE_AUTH_RATE_LIMIT: "true",
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testIgnore: /.*\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
});
