import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.WEB_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
