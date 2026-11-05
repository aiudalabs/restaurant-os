import { defineConfig } from '@playwright/test';

// Batería contra las apps DESPLEGADAS en dev. Un solo worker y specs en orden:
// comparten el tablero del KDS y el PIN de la estación. Sin trazas ni video:
// grabarían los PINs que se teclean. Las capturas solo se guardan al fallar.
export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.mjs',
  globalTeardown: './global-teardown.mjs',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    // Usa el Chrome instalado (sin descargar navegadores). E2E_CHANNEL=chromium para el de Playwright.
    channel: process.env.E2E_CHANNEL ?? 'chrome',
    headless: !process.env.E2E_HEADED,
    locale: 'es-PA',
    timezoneId: 'America/Panama',
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
});
