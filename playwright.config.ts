import { defineConfig, devices } from "@playwright/test";

// e2e/** is already excluded from vitest.config.mts — these are Playwright
// specs, run against a real browser and a real (locally built) Next.js
// server, never through jsdom.
//
// Deliberately on port 3101, not 3200/.claude/launch.json's dev port: this
// repo isn't the only Next.js project a developer may have running locally,
// and reuseExistingServer will happily attach to *any* server already
// listening on the configured port — including someone else's app — and
// every test would then fail against the wrong site with no obvious cause.
const PORT = 3101;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: process.env.CI ? `PORT=${PORT} pnpm start` : `pnpm build && PORT=${PORT} pnpm start`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Only this Playwright-spawned server gets the flag — `pnpm dev` and a
    // normal `pnpm start` never do, so using the actual app always calls
    // the real Groq/Anthropic APIs. See lib/ai/generate.ts's
    // MOCK_AI_RESPONSES comment for the full reasoning.
    env: { MOCK_AI_RESPONSES: "1" },
  },
});
