require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');
const { getAllClients } = require('./config/clients');

/**
 * Dynamically generates Playwright Projects for each discovered client.
 * 
 * Instead of hardcoding projects (e.g. adoc-sv-uat, thirdlove-uat), this function
 * iterates over the dynamically loaded client configurations (from .env or JSON)
 * and generates isolated browser profiles (Chromium, Firefox) for each client.
 * This enables the test suite to instantly support new clients without code changes.
 * 
 * @returns {Array} List of Playwright Project configuration objects
 */
const generateProjects = () => {
  const projects = [];
  const clients = getAllClients();

  for (const config of clients) {
    // Chromium project
    projects.push({
      name: `${config.name} - Chromium`,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: config.baseUrl,
      },
    });

    // Firefox project (Disabled to run on Chrome only)
    // projects.push({
    //   name: `${config.name} - Firefox`,
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     baseURL: config.baseUrl,
    //   },
    // });
  }
  return projects;
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
module.exports = defineConfig({
  testDir: process.env.TEST_DIR || './tests',
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Run parallel tests */
  workers: 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['monocart-reporter', {
      name: "OMS Automation Executive Report",
      outputFile: './playwright-report/index.html',
      logging: 'info'
    }]
  ],
  /* Maximum time one test can run for. */
  timeout: 5 * 60 * 1000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  /* Configure projects for each client discovered in .env */
  projects: generateProjects(),
});
