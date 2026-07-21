// Config mínima de propósito: o app não tem build (HTML/CSS/JS puro), então
// o "servidor" de teste é só servir os arquivos estáticos como estão.
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:8734",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npx http-server -p 8734 -s",
    url: "http://127.0.0.1:8734",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
