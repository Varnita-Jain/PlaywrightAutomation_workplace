/**
 * Optimized Playwright Fixtures
 * Manages automated authentication and page initialization.
 */

const { test: base, expect } = require('@playwright/test');
const { getClientConfig } = require('../config/clients');
const {
  performLogin,
  loadAuthState,
  saveAuthState,
  isSessionValid,
  getAuthStatePath
} = require('../utils/auth');
const { MessageValidator } = require('../utils/messageValidator');

/**
 * Extracts Client ID from the Playwright project name
 * Example: "mephisto-uat - Chromium" -> "mephisto-uat"
 */
function getClientId(testInfo) {
  const projectName = testInfo.project.name || '';
  // Support hyphens and numbers in client IDs (e.g., "adoc-pa-uat")
  const match = projectName.match(/^([A-Za-z0-9\-\s]+)\s*-/);

  if (match) {
    return match[1].trim().toLowerCase().replace(/\s+/g, '-');
  }

  return process.env.CLIENT;
}

const test = base.extend({
  /**
   * Provides a dynamically authenticated browser context for each test.
   * 
   * Logic:
   * 1. Checks if a valid auth token already exists for the specific client.
   * 2. If it does, attempts to reuse it.
   * 3. Validates the session live (checks if the Login button is unexpectedly visible).
   * 4. If the session is stale/expired, it automatically re-authenticates and saves the new token.
   */
  authenticatedContext: async ({ browser }, use, testInfo) => {
    const clientId = getClientId(testInfo);
    const config = getClientConfig(clientId);
    const statePath = getAuthStatePath(clientId);

    let context;

    if (isSessionValid(clientId)) {
      console.log(`\n📂 Using existing session for ${clientId}`);
      context = await browser.newContext({
        baseURL: config.baseUrl,
        storageState: loadAuthState(clientId),
      });

      const page = await context.newPage();
      try {
        await page.goto(config.baseUrl, { timeout: 10000 });
        // Wait for dynamic redirects or client-side rendering to settle
        await page.waitForTimeout(2000);
        
        // Check if the page shows a Login trigger OR a username input
        const loginElementsCount = await page.locator('a:has-text("Login"), button:has-text("Login"), input[name="USERNAME"], input[placeholder*="Username"], td.label:has-text("User Name") + td input').count();

        if (loginElementsCount > 0) {
          console.log(`⚠️ Session expired for ${clientId}. Re-authenticating...`);
          await performLogin(page, config);
          saveAuthState(clientId, await context.storageState());
        }
      } catch (e) {
        console.log(`Note: Session validation skipped for ${clientId}.`);
      }
      await page.close();
    } else {
      console.log(`\n🔑 Initializing new session for ${clientId}`);
      context = await browser.newContext({ baseURL: config.baseUrl });
      const page = await context.newPage();
      await performLogin(page, config);
      saveAuthState(clientId, await context.storageState());
      await page.close();
    }

    await use(context);
    await context.close();
  },

  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
  },

  clientId: async ({ }, use, testInfo) => {
    await use(getClientId(testInfo));
  },

  messageValidator: async ({ authenticatedPage }, use) => {
    await use(new MessageValidator(authenticatedPage));
  },

  /**
   * The core of the Atomic Data Pooling Architecture.
   * 
   * Instead of generating data directly inside the test, this fixture queries
   * the Local Test Data Server (running on port 3456) and pops EXACTLY ONE
   * unique Order ID for the current client. This guarantees 100% collision-free
   * parallel execution. If the pool is empty, it gracefully falls back to `null`,
   * triggering the UI fallback search in the Page Objects.
   */
  pooledOrder: async ({ clientId }, use) => {
    let orderId = null;
    try {
      const http = require('http');
      orderId = await new Promise((resolve) => {
        http.get(`http://127.0.0.1:3456/api/orders/pop?client=${clientId}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data).orderId);
            } else {
              resolve(null);
            }
          });
        }).on('error', () => resolve(null));
      });
    } catch (e) {
      console.log(`[Fixture] Error fetching pooled order: ${e.message}`);
    }

    if (!orderId) {
      console.log(`⚠️ Pool empty for ${clientId}. Tests should fallback to existing behavior or JIT.`);
    } else {
      console.log(`[Fixture] Successfully grabbed pooled order: ${orderId}`);
    }

    await use(orderId);
  },
});

module.exports = { test, expect };
