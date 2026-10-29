import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Endless decorative animations (wobble, pulse) never look "stable" to Playwright.
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["microphone", "notifications"],
        // A fake microphone so voice notes can be recorded in tests.
        launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
      },
    },
    { name: "iphone-safari", use: { ...devices["iPhone 14"] }, grep: /@smoke/ },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : { command: `npm run start -- -p ${PORT}`, port: PORT, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
