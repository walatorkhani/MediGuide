import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const frontendUrl = process.env.E2E_BASE_URL || "http://localhost:5173";
const backendUrl = process.env.E2E_API_HEALTH_URL || "http://localhost:5000/health";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global.setup.js",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["html"], ["list"]],
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm --prefix ../backend run dev",
      url: backendUrl,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --host localhost",
      url: frontendUrl,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
