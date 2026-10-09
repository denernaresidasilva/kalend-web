import { defineConfig } from '@playwright/test';
const mode = process.env.QA_MODE || 'local';
const targets: Record<string, string> = { local: 'http://127.0.0.1:3131', dev: 'https://dev.kalend.tech', staging: 'https://staging.kalend.tech' };
if (!targets[mode]) throw new Error('QA_MODE deve ser local, dev ou staging; produção proibida.');
export default defineConfig({
  testDir: './homologacao/specs',
  testMatch: mode === 'local' ? '**/*.local.spec.ts' : '**/*.real.spec.ts',
  timeout: 30_000, expect: { timeout: 10_000 }, workers: 1, retries: 0,
  forbidOnly: true, fullyParallel: false,
  outputDir: './homologacao/artifacts/test-results',
  reporter: [['list'], ['json', { outputFile: './homologacao/artifacts/playwright.json' }], ['html', { outputFolder: './homologacao/artifacts/html', open: 'never' }]],
  use: { baseURL: targets[mode], locale: 'pt-BR', trace: mode === 'local' ? 'retain-on-failure' : 'off', screenshot: mode === 'local' ? 'only-on-failure' : 'off',
    launchOptions: { executablePath: process.env.QA_CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] } },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: mode === 'local' ? { command: 'npm run start -- --hostname 127.0.0.1 --port 3131', url: targets.local, reuseExistingServer: false, timeout: 60_000 } : undefined,
});
