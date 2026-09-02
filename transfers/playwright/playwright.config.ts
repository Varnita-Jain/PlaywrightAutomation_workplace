
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { getAllClients } from "../config/clients";

// Load env variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Dynamically generate projects for each client found in environment
 */
const generateProjects = () => {
  const projects = [];
  let clients = getAllClients();

  // If a specific CLIENT is requested, filter the projects (supports comma-separated list)
  if (process.env.CLIENT) {
    const targets = process.env.CLIENT.toLowerCase().split(",").map((s: string) => s.trim());
    clients = clients.filter((c: any) => targets.includes(c.clientId.toLowerCase()));
  }

  for (const config of clients) {
    const clientId = config.clientId;

    // 1. Setup Auth
    projects.push({
      name: `setup-${clientId}`,
      testMatch: /.*auth\.setup\.ts/,
    });

    // 2. Normal Test Execution
    projects.push({
      name: `chromium-${clientId}`,
      use: {
        ...devices["Desktop Chrome"],
        storageState: `playwright/.auth/${clientId}.user.json`,
        baseURL: config.baseUrl,
      },
      dependencies: [`setup-${clientId}`],
    });
  }

  return projects;
};

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  projects: generateProjects(),
  outputDir: 'test-results',
});
