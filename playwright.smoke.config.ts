import { defineConfig, devices } from "@playwright/test";

const requiredEnvNames = [
  "SMOKE_BASE_URL",
  "SMOKE_CLIENT_EMAIL",
  "SMOKE_CLIENT_PASSWORD",
  "SMOKE_TRAVELER_EMAIL",
  "SMOKE_TRAVELER_PASSWORD",
] as const;

function getRequiredEnv(name: (typeof requiredEnvNames)[number]) {
  const value = process.env[name]?.trim();

  if (!value) {
    if (name === "SMOKE_BASE_URL") {
      throw new Error(
        "Falta SMOKE_BASE_URL. El smoke autenticado no usa production por defecto."
      );
    }

    throw new Error(`Falta el secret requerido ${name}.`);
  }

  return value;
}

for (const name of requiredEnvNames) {
  getRequiredEnv(name);
}

const baseURL = getRequiredEnv("SMOKE_BASE_URL");

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
