const { expect } = require('@playwright/test');

/**
 * Base Page for Sales Order Operations
 * Provides shared functionality for navigating and filtering orders.
 */
class BaseSalesOrderPage {
  constructor(page, baseURL, clientId) {
    this.page = page;
    this.baseURL = baseURL;
    this.clientId = clientId;
  }

  /**
   * Universal Order Finder & Graceful UI Fallback
   * 
   * This is the core engine for unseeded environments. If a test doesn't have 
   * a pooled order, it falls back to this function to find an organic order.
   * 
   * Logic:
   * 1. Navigates to the Order Listing view.
   * 2. Uses Playwright `.filter({ hasText: ... })` to dynamically chain constraints.
   * 3. Finds the very first `<tr>` that matches the inclusion constraints and 
   *    does NOT contain the exclusion strings.
   * 4. Gracefully throws a standard `[DATA ERROR]` if no such row exists, preventing
   *    the test from timing out silently.
   * 
   * @param {Object} options 
   * @param {string} options.status - Primary status filter (e.g., 'Approved', 'Created')
   * @param {Array<string>} options.includeTexts - Rows MUST contain all these strings (AND)
   * @param {Array<string>} options.anyOfTexts - Rows MUST contain at least one of these strings (OR)
   * @param {Array<string>} options.excludeTexts - Rows MUST NOT contain these strings
   */
  async openSalesOrderByFilter({ status = 'Approved', includeTexts = [], anyOfTexts = [], excludeTexts = [] } = {}) {
    // 1. Construct navigation URL
    const url = new URL(this.baseURL);
    const targetUrl = `${url.origin}/commerce/control/FindOrder?ff_orderStatusDesc=${status}`;
    
    console.log(`Searching for ${status} orders...`);
    await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000); // Wait for dynamic content to settle

    // 2. Build row locator with dynamic filters (Ensure row contains the status text)
    let rowLocator = this.page.locator('tbody tr:has(a[href*="orderId="])').filter({ hasText: status });

    // Add inclusion constraints
    for (const text of includeTexts) {
      rowLocator = rowLocator.filter({ hasText: text });
    }

    // Add OR constraints using RegExp
    if (anyOfTexts && anyOfTexts.length > 0) {
      const regex = new RegExp(anyOfTexts.join('|'), 'i');
      rowLocator = rowLocator.filter({ hasText: regex });
    }

    // Add exclusion constraints
    for (const text of excludeTexts) {
      rowLocator = rowLocator.filter({ hasNotText: text });
    }

    const targetRow = rowLocator.first();
    
    // 3. Validation and Navigation
    const flowName = status || 'Default';

    await expect(targetRow).toBeVisible({ timeout: 10000 }).catch(async () => {
      const noRecordsMsg = this.page.locator('text="No records found"').first();
      const isNoRecords = await noRecordsMsg.isVisible().catch(() => false);
      
      const reason = isNoRecords 
        ? `No Records Found in the UI list.` 
        : `Order matching criteria not found (include=[${includeTexts}], exclude=[${excludeTexts}]).`;

      throw new Error(`\n[DATA ERROR] No Order Found For ${this.clientId} in ${flowName} Flow.\nReason: ${reason}\nSuggestion: Seed data for this client or try another client environment.\n`);
    });

    console.log('Valid order found. Navigating to order details...');
    await targetRow.locator('a[href*="orderId="]').first().click();
    
    // Ensure detail page is fully loaded
    await this.page.waitForTimeout(2000); 
  }

  async openOrderById(orderId, maxRetries = 24, pollIntervalMs = 10000) {
    const url = new URL(this.baseURL);
    // Use the keyword parameter which HotWax actually respects for searching external Shopify IDs
    const searchUrl = `${url.origin}/commerce/control/FindOrder?keyword=${encodeURIComponent(orderId)}&userSearchPrefTypeId=SALES_ORDER_QUERY`;
    
    console.log(`Searching for specific order: ${orderId}...`);
    // Find the row containing the text of the orderId (e.g. #KREWE39189), because the href attribute uses the internal HotWax ID (M106555)
    const targetRow = this.page.locator('tbody tr').filter({ hasText: orderId }).first();
    let isFound = false;

    for (let i = 0; i < maxRetries; i++) {
        await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(2000); // Wait for dynamic content to settle
        
        if (await targetRow.isVisible()) {
            isFound = true;
            break;
        }
        console.log(`[Polling] Order ${orderId} not yet synced to HotWax. Retrying in ${pollIntervalMs/1000}s... (${i+1}/${maxRetries})`);
        await this.page.waitForTimeout(pollIntervalMs);
    }
    
    if (!isFound) {
      throw new Error(`\n[DATA ERROR] Order ID ${orderId} not found in HotWax after ${maxRetries * pollIntervalMs / 1000} seconds.\nSuggestion: Ensure the Shopify sync webhook is functioning.\n`);
    }

    console.log(`Found order ${orderId}. Navigating to details...`);
    // Crucial fix: The first <a> might be the external Shopify link. We MUST click the internal orderId link!
    await targetRow.locator('a[href*="orderId="]').first().click();
    
    await this.page.waitForTimeout(2000);
  }
}

module.exports = { BaseSalesOrderPage };
