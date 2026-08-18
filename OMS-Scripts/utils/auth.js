/**
 * Unified Authentication Helper
 * Manages login flows, session persistence, and auth state files.
 */

const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');

// Path to store authentication states
const AUTH_DIR = path.join(__dirname, '../auth');

/**
 * Ensures the auth directory exists
 */
function ensureAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

/**
 * Gets the auth state file path for a client
 */
function getAuthStatePath(clientId) {
  return path.join(AUTH_DIR, `${clientId}.json`);
}

/**
 * Performs the login flow for a specific client
 * @param {import('@playwright/test').Page} page
 * @param {Object} clientConfig - Configuration object from clients.js
 */
async function performLogin(page, clientConfig) {
  const { clientId, baseUrl, username, password } = clientConfig;
  
  if (!username || !password) {
    throw new Error(`Credentials missing for ${clientId}. Provide username/password in CLIENTS JSON or env.`);
  }

  console.log(`\nStarting login flow for ${clientId}...`);
  await page.goto(baseUrl);

  // 1. Click Login trigger
  const loginTrigger = page.locator('a:has-text("Login"), button:has-text("Login")').first();
  await loginTrigger.click();
  await page.waitForURL(/\/control\/checkLogin/);

  // 2. Fill credentials (support both classic and modern login pages)
  const userField = page.locator('input[name="USERNAME"], input[placeholder*="Username"], td.label:has-text("User Name") + td input').first();
  await expect(userField).toBeVisible({ timeout: 10000 });
  await userField.fill(username);

  const passField = page.locator('input[type="password"][name="PASSWORD"], input[placeholder*="Password"]').first();
  await passField.fill(password);

  // 3. Submit
  const submitBtn = page.locator('input[type="submit"][value="Login"], button:has-text("Login")').first();
  await submitBtn.click();
  await page.waitForLoadState('domcontentloaded');

  // 4. Navigate to Commerce
  const commerceLink = page.locator('a:has-text("Hotwax Commerce"), a:has-text("Commerce"), a:has-text("OMS"), a:has-text("ORDER")').first();
  await commerceLink.waitFor({ state: 'visible', timeout: 20000 }).catch(async () => {
    await page.screenshot({ path: `login_fail_${clientId}.png` });
    throw new Error(`Commerce link not found for ${clientId}. Session might be invalid.`);
  });
  
  await commerceLink.click();
  await page.waitForLoadState('load');
  
  // Hard wait for session stabilization (avoids 401s on initial requests)
  await page.waitForTimeout(3000);
  console.log(`Successfully logged in to ${clientId}.`);
}

/**
 * Saves authenticated browser state
 */
function saveAuthState(clientId, state) {
  ensureAuthDir();
  fs.writeFileSync(getAuthStatePath(clientId), JSON.stringify(state, null, 2));
}

/**
 * Loads stored browser state
 */
function loadAuthState(clientId) {
  const filePath = getAuthStatePath(clientId);
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : null;
}

/**
 * Checks if a valid auth session exists
 */
function isSessionValid(clientId) {
  return fs.existsSync(getAuthStatePath(clientId));
}

/**
 * Clears all stored auth states
 */
function clearAllSessions() {
  if (fs.existsSync(AUTH_DIR)) {
    const files = fs.readdirSync(AUTH_DIR).filter(f => f.endsWith('.json'));
    files.forEach(f => fs.unlinkSync(path.join(AUTH_DIR, f)));
    console.log(`Cleared ${files.length} sessions.`);
  }
}

module.exports = {
  performLogin,
  saveAuthState,
  loadAuthState,
  isSessionValid,
  getAuthStatePath,
  clearAllSessions
};
