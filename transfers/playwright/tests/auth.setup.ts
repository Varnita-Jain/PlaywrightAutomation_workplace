/**
 * auth.setup.ts
 * Global setup script for Playwright. Authenticates with Launchpad and saves the storage state
 * so tests don't have to log in repeatedly.
 */
import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
const { getClientConfig } = require("../../config/clients");
const { TabsPage } = require('../pages/TabsPage');

/**
 * Perform login via Launchpad and navigate to the Transfers App
 */
async function performLogin(page, context, config) {
  // Mock the appVersions API to prevent the 404 error on UAT from crashing the Login UI
  await page.route('**/appVersions**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({})
  }));

  const { clientId, username, password, oms } = config;
  
  if (!username || !password) {
    throw new Error(`Credentials missing for ${clientId}. Provide username/password in CLIENTS JSON or env.`);
  }

  console.log(`\nStarting Launchpad login flow for Transfers (${clientId})...`);
  
  const launchpadUrl = process.env.VUE_APP_LOGIN_URL || process.env.LAUNCHPAD_URL || 'https://launchpad.hotwax.io/login';
  console.log(`Navigating to ${launchpadUrl}`);
  
  await page.goto(launchpadUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Give Vue time to settle

  // Fill OMS
  console.log(`Launchpad OMS screen detected. Filling OMS...`);
  const omsInput = page.locator('ion-input, input[type="text"]').first();
  const omsUrl = oms || `https://${clientId}.hotwax.io`;
  
  await omsInput.click();
  await page.keyboard.type(omsUrl, { delay: 50 });
  await page.waitForTimeout(1000); // Wait for Vue to detect input and enable the NEXT button
  
  const nextBtn = page.locator('ion-button:has-text("NEXT"), button:has-text("NEXT")').first();
  await nextBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(2000);

  // Fill credentials
  const userField = page.locator('input[name="username"], input[name="USERNAME"], ion-input[name="username"] input, input[placeholder*="sername"]').first();
  await expect(userField).toBeVisible({ timeout: 15000 });
  
  console.log(`Filling credentials for ${clientId}...`);
  await userField.click();
  await page.keyboard.type(username, { delay: 50 });
  
  const passField = page.locator('input[name="password"], input[type="password"]').first();
  await passField.click();
  await page.keyboard.type(password, { delay: 50 });
  await passField.press('Enter');
  
  await page.waitForTimeout(1000);
  const loginBtn = page.locator('ion-button:has-text("Login"), button:has-text("Login"), ion-button:has-text("LOGIN"), button:has-text("LOGIN")').first();
  if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click({ force: true }).catch(() => {});
  }
  
  // Wait for Launchpad Home Dashboard
  await page.waitForURL(/.*\/home.*/i, { timeout: 15000 });
  console.log(`Successfully logged into Launchpad for ${clientId}`);
  await page.waitForTimeout(3000);

  // Click the Transfers app card
  const transfersCard = page.locator('ion-card').filter({ hasText: 'Transfers' }).first();
  
  try {
    // Some launchpads have many apps; scroll to ensure the card is in the DOM/visible
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(1000);
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(1000);

    // Wait for it to be attached to the DOM first
    await transfersCard.waitFor({ state: 'attached', timeout: 5000 });
    await transfersCard.scrollIntoViewIfNeeded();
    await expect(transfersCard).toBeVisible({ timeout: 5000 });
    console.log('Clicking Transfers App card...');
    await transfersCard.click();
  } catch (e) {
    console.log('Transfers card not found in Launchpad. Navigating directly to Transfers App...');
    const appUrl = config.baseUrl || process.env.TRANSFERS_URL;
    await page.goto(appUrl);
  }

  // Wait for the tab (Transfers app) to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000); // Give ionic time to settle and fetch store info

  // Verify landing on Transfers App
  try {
    await Promise.any([
      page.waitForURL(/.*\/transfers.*/i, { timeout: 15000 }),
      page.waitForSelector('ion-menu', { state: 'visible', timeout: 15000 })
    ]);
  } catch (e) {
      throw new Error(`Failed to land on Transfers App. URL: ${page.url()}`);
  }

  console.log(`Successfully landed on Transfers App for ${clientId}`);
  
  // Ensure a product store is selected in Settings
  const tabsPage = new TabsPage(page);
  
  console.log('Navigating to Settings to check Product Store...');
  await tabsPage.goToSettings();
  await page.waitForTimeout(3000);

  const storeSelector = page.locator('ion-select').filter({ hasText: /Select store/i }).first();
  await expect(storeSelector).toBeVisible({ timeout: 15_000 });
  
  const selectedStore = await storeSelector.evaluate((el: any) => el.value);
  if (!selectedStore) {
    console.log(`No product store selected. Selecting first available store...`);
    await storeSelector.click();
    
    // Wait for the action sheet or alert options
    const firstOption = page.getByRole('radio').first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();
    
    // Check if there is an OK/Done button and click it
    const okBtn = page.getByRole('button', { name: /OK|Done|Save/i }).first();
    try {
      await okBtn.waitFor({ state: 'visible', timeout: 2000 });
      await okBtn.click();
    } catch (e) {
      // No OK button found within 2s, assume it's a popover that auto-closes
    }
    await page.waitForTimeout(2000); // Give it time to save via API
  }

  console.log('Ensuring Product Identifier Primary is set to SKU...');
  try {
    const productIdentifierCard = page.getByTestId('settings-product-identifier').first();
    if (await productIdentifierCard.isVisible({ timeout: 5000 })) {
      // Find the ion-item containing 'Primary' and its ion-select
      const primaryItem = productIdentifierCard.locator('ion-item').filter({ hasText: 'Primary' }).first();
      const primarySelect = primaryItem.locator('ion-select').first();
      
      const currentPrimary = await primarySelect.evaluate((el: any) => el.value);
      if (currentPrimary !== 'sku') {
        console.log(`Current primary identifier is '${currentPrimary}'. Changing to 'sku'...`);
        await primarySelect.click();
        
        // Wait for the action sheet or alert options
        const skuOption = page.getByRole('radio', { name: /SKU/i }).first();
        await expect(skuOption).toBeVisible({ timeout: 5000 });
        await skuOption.click();
        
        // Check if there is an OK/Done button and click it
        const okBtn = page.getByRole('button', { name: /OK|Done|Save/i }).first();
        try {
          await okBtn.waitFor({ state: 'visible', timeout: 2000 });
          await okBtn.click();
        } catch (e) {
          // No OK button found within 2s, assume it's a popover that auto-closes
        }
        await page.waitForTimeout(2000); // Give it time to save via API
      } else {
        console.log('Primary Product Identifier is already set to SKU.');
      }
    } else {
      console.log('Product Identifier settings not found or visible, skipping...');
    }
  } catch (e) {
    console.log(`Failed to set Product Identifier: ${e.message}`);
  }

  // Navigate back to the main app (Transfers tab)
  console.log('Navigating back to Transfers...');
  await tabsPage.goToTransfers();
  await page.waitForTimeout(3000);

  return page;
}

setup("authenticate and save storage state", async ({ page, context }, testInfo) => {
  const projectName = testInfo.project.name;
  const clientId = projectName.replace("setup-", "");
  
  const config = getClientConfig(clientId);
  const authFilePath = path.resolve(__dirname, `../.auth/${clientId}.user.json`);

  await performLogin(page, context, config);

  fs.mkdirSync(path.dirname(authFilePath), { recursive: true });
  await page.context().storageState({ path: authFilePath });
  console.log(`Saved authentication state for ${clientId} to ${authFilePath}`);
});
