import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.SMOKE_BASE_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://intra-chi.vercel.app";

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90 * 1000,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "off",
    screenshot: "off",
    video: "off",
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
