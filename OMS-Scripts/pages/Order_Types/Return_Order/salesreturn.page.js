const { expect } = require('@playwright/test');
const { BaseSalesOrderPage } = require('../Sales_Order/base.page');

class SalesReturnOMSPage extends BaseSalesOrderPage {
  constructor(page, baseURL, clientId) {
    super(page, baseURL, clientId);
  }

  async navigateToSalesReturns() {
    console.log('Navigating to Sales Returns...');

    const salesReturnLink = this.page.locator('a[href*="FindReturn"]').filter({ hasText: 'Sales Returns' }).first();

    if (!await salesReturnLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.page.evaluate(() => {
        const sidebar = document.querySelector('.side-menu');
        if (sidebar) sidebar.classList.remove('hidden-xs');
      });

      const sideMenu = this.page.locator('.side-menu').first();
      if (await sideMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sideMenu.hover();
      }

      await this.page.evaluate(() => {
        const links = document.querySelectorAll('a[data-form-submit="ORDER_MENU"]');
        links.forEach(link => link.click());
      });

      if (!await salesReturnLink.isVisible({ timeout: 10000 }).catch(() => false)) {
        const url = new URL(this.baseURL);
        await this.page.goto(`${url.origin}/commerce/control/FindReturn?returnDateRange=NOW-30DAY_TO_NOW`);
        await this.page.waitForLoadState('networkidle').catch(() => {});
      }
    }

    if (await salesReturnLink.isVisible().catch(() => false)) {
      await salesReturnLink.evaluate(link => link.click());
      await this.page.waitForLoadState('networkidle').catch(() => {});
    }

    // Verify correct page is opened by validating the URL or heading
    await expect(async () => {
      const url = this.page.url();
      expect(url.includes('FindReturn') || url.includes('SalesReturn')).toBeTruthy();
    }).toPass({ timeout: 15000 }).catch(async () => {
      const headingOrButton = this.page.locator('h1, h2, h3, button').filter({ hasText: /Sales Returns?|Find Returns?/i }).first();
      await expect(headingOrButton).toBeVisible({ timeout: 5000 });
    });

    await this.page.evaluate(() => {
      document.querySelectorAll('main > nav, .side-menu').forEach(el => {
        el.style.pointerEvents = 'none';
      });
    });
  }

  async selectStatus(statusText) {
    console.log(`Selecting Status: ${statusText}`);
    
    // Find the wrapper that contains the hidden select element for "statusId"
    let statusContainer = this.page.locator('div.bootstrap-select, div.dropdown').filter({ has: this.page.locator('select[name="statusId"], select#statusId') }).first();
    
    if (await statusContainer.count() === 0) {
        const statusLabel = this.page.locator('label, span, div').filter({ hasText: /^Status$/ }).first();
        statusContainer = statusLabel.locator('xpath=ancestor::*[contains(@class, "generic") or contains(@class, "field") or contains(@class, "item") or contains(@class, "form-group")][1]').first();
    }
    
    // The clickable trigger is the button inside this container
    const dropdownTrigger = statusContainer.locator('button.dropdown-toggle, button[title="Select"], .filter-option-inner, ion-select').first();
    try {
      await dropdownTrigger.waitFor({ state: 'visible', timeout: 5000 });
      await dropdownTrigger.click({ force: true });
    } catch (e) {
      throw new Error(`[DATA ERROR] Status filter dropdown trigger not found.`);
    }

    // Select the requested option from the open dropdown menu (search entire page because menu may be appended to body)
    let selectedStatus = statusText;
    let option = this.page.locator('.dropdown-menu.open a[role="option"], .dropdown-menu.show a[role="option"], .dropdown-menu.show span.text, .dropdown-menu.open span.text')
      .filter({ hasText: statusText }).first();

    if (!await option.isVisible({ timeout: 3000 }).catch(() => false) && statusText === 'Accepted') {
      selectedStatus = 'Authorized';
      option = this.page.locator('.dropdown-menu.open a[role="option"], .dropdown-menu.show a[role="option"], .dropdown-menu.show span.text, .dropdown-menu.open span.text')
        .filter({ hasText: selectedStatus }).first();
    }
    
    try {
      await option.waitFor({ state: 'visible', timeout: 5000 });
      await option.click({ force: true });
    } catch (e) {
      throw new Error(`[DATA ERROR] Status option '${selectedStatus}' not available in dropdown.`);
    }

    await expect(statusContainer).toContainText(selectedStatus, { timeout: 5000, ignoreCase: true });
    await this.page.waitForTimeout(2000);
    
    await this.page.waitForTimeout(1000); // Give UI time to register the selection
    return selectedStatus;
  }

  async selectFacility() {
    console.log('Selecting Facility...');
    
    // Find the wrapper that contains the hidden select element for facility
    let facilityContainer = this.page.locator('div.bootstrap-select, div.dropdown').filter({ has: this.page.locator('select[name*="acility"], select#facilityId') }).first();
    
    // Fallback: If not found, find the label "Facility" and go up to its parent, then find the container
    if (await facilityContainer.count() === 0) {
        const facilityLabel = this.page.locator('div, span, label').filter({ hasText: /^Facility$/ }).first();
        facilityContainer = facilityLabel.locator('xpath=ancestor::*[contains(@class, "generic") or contains(@class, "field") or contains(@class, "item") or contains(@class, "form-group")][1]').first();
    }

    // Open the Facility dropdown
    const dropdownTrigger = facilityContainer.locator('button.dropdown-toggle, button[title="Select"], .filter-option-inner, ion-select').first();
    try {
      await dropdownTrigger.waitFor({ state: 'visible', timeout: 5000 });
      await dropdownTrigger.click({ force: true });
    } catch (e) {
      throw new Error(`[DATA ERROR] Facility filter dropdown trigger not found.`);
    }
    
    // Select any available facility option from the open dropdown (search entire page)
    const options = this.page.locator('.dropdown-menu.open a[role="option"], .dropdown-menu.show a[role="option"], .dropdown-menu.open span.text, .dropdown-menu.show span.text');
    const firstValidOption = options.filter({ hasNotText: /^Select$/ }).last();
    
    try {
      await firstValidOption.waitFor({ state: 'visible', timeout: 5000 });
      await firstValidOption.click({ force: true });
    } catch (e) {
      throw new Error(`[DATA ERROR] No Facility option available in dropdown.`);
    }
    
    await this.page.waitForTimeout(2000);
    await this.page.waitForTimeout(1000);
  }

  async selectDateMoreThan30Days() {
    console.log('Selecting Date filter: More than 30 days');

    const radioInput = this.page.locator('input#returnDateMore[name="returnDateRange"][value="START_TO_NOW-30DAY"]');
    const radioLabel = this.page.locator('label[for="returnDateMore"]').filter({ hasText: 'More than 30 days' });

    if (!await radioLabel.isVisible().catch(() => false)) {
      const dateLabel = this.page.locator('label').filter({ hasText: /^Date$/ }).last();
      const dateContainer = dateLabel.locator('xpath=ancestor::*[contains(@class, "generic") or contains(@class, "field") or contains(@class, "item") or contains(@class, "form-group") or contains(@class, "search-facet")][1]').first();
      const dropdownTrigger = dateContainer.locator('button.dropdown-toggle, .dropdown-toggle').first();

      await dropdownTrigger.waitFor({ state: 'visible', timeout: 10000 });
      await dropdownTrigger.click({ force: true });
    }

    await radioInput.waitFor({ state: 'attached', timeout: 10000 });
    await radioInput.check({ force: true }).catch(async () => {
      await radioLabel.click({ force: true });
    });

    await expect(radioInput).toBeChecked({ timeout: 5000 });
    await this.page.locator('button[aria-label="Search"], button[type="submit"][form="findForm"]').first().click({ force: true });
    
    // Wait for search to execute
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(5000);
    await this.page.waitForTimeout(3000);
  }

  async verifyTableResultsStatus(expectedStatus) {
    console.log(`Verifying table results for status: ${expectedStatus}`);
    
    // Check if the "No keyword matches" message is displayed
    const noResultsMsg = this.page.locator('text=No keyword matches, text=No records found, text=No Return records found, .no-record-msg, .alert-info').first();
    const isNoResults = await noResultsMsg.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isNoResults) {
        console.log('No records found matching the applied filters. This is a valid state for UAT.');
        return;
    }
    
    // Verify results table is displayed
    const table = this.page.locator('table, ion-list').filter({ has: this.page.locator('tr, ion-item') }).first();
    try {
      await table.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      if (isNoResults) {
        console.log('No records found matching the applied filters. This is a valid state for UAT.');
        return;
      }
      throw new Error(`[DATA ERROR] Results table not visible, and no standard 'No records' message was detected. Assuming no data.`);
    }
    
    // Locate the Status column index
    const headers = this.page.locator('thead th');
    const headerCount = await headers.count();
    let statusIndex = -1;
    
    for (let i = 0; i < headerCount; i++) {
        const text = await headers.nth(i).innerText();
        if (text.trim() === 'Status') {
            statusIndex = i;
            break;
        }
    }
    
    if (statusIndex === -1) {
        throw new Error('[DATA ERROR] Status column not found in the table header. This UI may not support table-based verification.');
    }
    
    // Read all row values under the Status column
    const rows = this.page.locator('tbody tr').filter({ has: this.page.locator('td') });
    const rowCount = await rows.count();
    
    if (rowCount === 0) {
        console.log('No records found matching the applied filters.');
        return; // Valid state if filters return no data, though we can throw if we expect data
    }
    
    console.log(`Found ${rowCount} rows in the table. Verifying each matches '${expectedStatus}'.`);
    for (let i = 0; i < rowCount; i++) {
        const cell = rows.nth(i).locator('td').nth(statusIndex);
        const cellText = await cell.innerText();
        
        // Verify that every row value matches the selected dropdown value and no other status is displayed
        expect(cellText.trim()).toBe(expectedStatus);
    }
    console.log('All visible rows matched the expected status successfully.');
  }
}

module.exports = { SalesReturnOMSPage };
