import { defineConfig, devices } from "@playwright/test";

// E2E runs against the production build with the real OpenRouter models
// (ADR-001 §3.7, plan TR1). Firefox and WebKit run only the specs tagged
// @cross-browser, to keep AI credit use small (ADR-005 A21).
const PORT = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-360",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true },
      grep: /@mobile|@cross-browser/,
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, grep: /@cross-browser/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, grep: /@cross-browser/ },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // E2E_REUSE=1: run against a server started separately (its stdout is the TR3 stage-log evidence).
    reuseExistingServer: process.env.E2E_REUSE === "1",
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
