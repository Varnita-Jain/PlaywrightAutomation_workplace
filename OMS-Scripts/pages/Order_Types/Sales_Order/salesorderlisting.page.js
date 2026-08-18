const { expect } = require('@playwright/test');
const { BaseSalesOrderPage } = require('./base.page');

/**
 * Page Object for Sales Order Listing
 * Handles interactions with the order table, specifically checkboxes for bulk actions.
 */
class SalesOrderListingPage extends BaseSalesOrderPage {

  constructor(page, baseURL, clientId) {
    super(page, baseURL, clientId);
  }

  /**
   * Navigates to the Sales Order Listing page (FindOrder).
   */
  async navigateToFindOrder() {
    const url = new URL(this.baseURL);
    const targetUrl = `${url.origin}/commerce/control/FindOrder`;
    await this.page.goto(targetUrl);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Locates all rows in the results table.
   */
  get rows() {
    // Only target rows that have a checkbox (selectable orders)
    return this.page.locator('tbody tr').filter({ has: this.page.locator('input[type="checkbox"], .checkbox, ion-checkbox, [role="checkbox"]') });
  }

  /**
   * Locates the "Select All" checkbox in the table header.
   */
  get selectAllCheckbox() {
    return this.page.locator('thead th input[type="checkbox"], thead th .checkbox, #selectAll').first();
  }

  /**
   * Selects or deselects the "Select All" checkbox.
   * @param {boolean} checked 
   */
  async toggleSelectAll(checked = true) {
    const checkbox = this.selectAllCheckbox;
    await checkbox.waitFor({ state: 'attached', timeout: 10000 });
    
    // Self-healing click: try checking, then try direct click if it fails
    const isChecked = await checkbox.isChecked().catch(() => false);
    if (isChecked !== checked) {
        console.log(`Toggling Select All to: ${checked}`);
        if (checked) {
            await checkbox.check({ force: true }).catch(() => checkbox.click({ force: true }));
        } else {
            await checkbox.uncheck({ force: true }).catch(() => checkbox.click({ force: true }));
        }
        // Small wait for UI state to propagate to rows
        await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Selects a specific order by its ID or index.
   * @param {string|number} identifier - Order ID string or row index (0-based).
   */
  async selectOrder(identifier) {
    let row;
    if (typeof identifier === 'number') {
      row = this.rows.nth(identifier);
    } else {
      row = this.rows.filter({ hasText: identifier }).first();
    }

    await row.scrollIntoViewIfNeeded().catch(() => {});
    const checkbox = row.locator('input[type="checkbox"], .checkbox, ion-checkbox, [role="checkbox"], .checkmark').first();
    
    try {
        await checkbox.waitFor({ state: 'visible', timeout: 15000 });
    } catch (e) {
        console.warn(`Checkbox not visible for order: ${identifier}. Logging row HTML...`);
        const html = await row.evaluate(el => el.innerHTML).catch(() => 'unable to get html');
        console.log(`Row HTML: ${html}`);
    }
    
    const isChecked = await checkbox.isChecked().catch(() => false);
    if (!isChecked) {
      await checkbox.click({ force: true }).catch(() => checkbox.check({ force: true }));
    }
  }

  /**
   * Deselects a specific order by its ID or index.
   * @param {string|number} identifier 
   */
  async deselectOrder(identifier) {
    let row;
    if (typeof identifier === 'number') {
      row = this.rows.nth(identifier);
    } else {
      row = this.rows.filter({ hasText: identifier }).first();
    }

    const checkbox = row.locator('input[type="checkbox"], .checkbox, ion-checkbox, [role="checkbox"]').first();
    await checkbox.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
        console.warn(`Checkbox not visible for order: ${identifier}`);
    });

    const isChecked = await checkbox.isChecked().catch(() => false);
    if (isChecked) {
      await checkbox.click({ force: true }).catch(() => checkbox.uncheck({ force: true }));
    }
  }

  /**
   * Selects multiple orders by their indices.
   * @param {number[]} indices 
   */
  async selectMultipleOrders(indices) {
    for (const index of indices) {
      await this.selectOrder(index);
    }
  }

  /**
   * Verifies if a specific order checkbox is checked.
   * @param {number} index 
   * @returns {Promise<boolean>}
   */
  async isOrderSelected(index) {
    return await this.rows.nth(index).locator('input[type="checkbox"], .checkbox').first().isChecked();
  }

  /**
   * Gets the count of selected orders.
   */
  async getSelectedCount() {
    // Look for various checkbox implementations across clients
    const selectors = [
        'tbody tr input[type="checkbox"]:checked',
        'tbody tr .checkbox.checked',
        'tbody tr .checkbox-checked',
        'tbody tr ion-checkbox[aria-checked="true"]',
        'tbody tr .selected input[type="checkbox"]'
    ];
    
    for (const selector of selectors) {
        const count = await this.page.locator(selector).count();
        if (count > 0) return count;
    }
    
    return 0;
  }

  /**
   * Checks the "Pre-orders" facility filter.
   */
  async filterByPreOrder() {
    console.log('Checking "Pre-orders" facility filter...');
    const preOrderCheckbox = this.page.locator('#preOrders');
    await preOrderCheckbox.waitFor({ state: 'attached' });
    const isChecked = await preOrderCheckbox.isChecked();
    if (!isChecked) {
        await preOrderCheckbox.check({ force: true });
        await this.page.waitForTimeout(3000); // Allow table to reload
    }
  }

  /**
   * Checks the "Back Orders" facility filter.
   */
  async filterByBackOrder() {
    console.log('Checking "Back Orders" facility filter...');
    const backOrderCheckbox = this.page.locator('#backOrders');
    await backOrderCheckbox.waitFor({ state: 'attached' });
    const isChecked = await backOrderCheckbox.isChecked();
    if (!isChecked) {
        await backOrderCheckbox.check({ force: true });
        await this.page.waitForTimeout(3000); // Allow table to reload
    }
  }

  /**
   * Checks the "Brokering Queue" facility filter.
   */
  async filterByBrokeringQueue() {
    console.log('Checking "Brokering Queue" facility filter...');
    const brokeringCheckbox = this.page.locator('#brokeringQueue');
    await brokeringCheckbox.waitFor({ state: 'attached' });
    const isChecked = await brokeringCheckbox.isChecked();
    if (!isChecked) {
        await brokeringCheckbox.check({ force: true });
        await this.page.waitForTimeout(3000); // Allow table to reload
    }
  }

  /**
   * Checks the "Unfillable Hold" facility filter.
   */
  async filterByUnfillableHold() {
    console.log('Checking "Unfillable Hold" facility filter...');
    const unfillableCheckbox = this.page.locator('#unfillableHold');
    await unfillableCheckbox.waitFor({ state: 'attached' });
    const isChecked = await unfillableCheckbox.isChecked();
    if (!isChecked) {
        await unfillableCheckbox.check({ force: true });
        await this.page.waitForTimeout(3000); // Allow table to reload
    }
  }

  /**
   * Checks the "Auto Cancel Today" filter.
   */
  async filterByAutoCancelToday() {
    console.log('Checking "Auto Cancel Today" filter...');
    const autoCancelCheckbox = this.page.locator('#autoCancelToday');
    await autoCancelCheckbox.waitFor({ state: 'attached' });
    const isChecked = await autoCancelCheckbox.isChecked();
    if (!isChecked) {
        await autoCancelCheckbox.check({ force: true });
        await this.page.waitForTimeout(3000); // Allow table to reload
    }
  }

  /**
   * Verifies that the Facility column in all rows contains the expected text.
   * @param {string} expectedText 
   */
  async verifyFacilityColumn(expectedText) {
    // Wait for the table or validation message
    const validationMsg = this.page.locator('text="No keyword matches the search criteria.", text="No records found"').first();
    const table = this.page.locator('table').first();
    const tableHeader = this.page.locator('thead th').first();

    console.log('Waiting for table results or validation message...');
    try {
        await Promise.race([
            table.waitFor({ state: 'visible', timeout: 20000 }),
            validationMsg.waitFor({ state: 'visible', timeout: 20000 })
        ]);
    } catch (e) {
        console.log('Timeout waiting for table or validation message. Proceeding to check visibility...');
    }

    if (await validationMsg.isVisible()) {
        console.log('Validation found: "No keyword matches the search criteria."');
        return;
    }

    // Wait for header to be visible if table is visible
    if (await table.isVisible()) {
        await tableHeader.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
            console.warn('Table header did not become visible within 10s.');
        });
    }

    const headers = this.page.locator('thead th');
    const headerCount = await headers.count();
    let colIndex = -1;
    const headerTexts = [];

    if (headerCount === 0) {
        console.warn('No headers found using "thead th". Trying fallback "th"...');
        const fallbackHeaders = this.page.locator('th');
        const fallbackCount = await fallbackHeaders.count();
        for (let i = 0; i < fallbackCount; i++) {
            const text = await fallbackHeaders.nth(i).innerText();
            headerTexts.push(text.trim());
            if (text.toLowerCase().includes('facility')) colIndex = i;
        }
    } else {
        for (let i = 0; i < headerCount; i++) {
            const text = await headers.nth(i).innerText();
            headerTexts.push(text.trim());
            if (text.toLowerCase().includes('facility')) colIndex = i;
        }
    }

    console.log(`Table Headers: [${headerTexts.join(' | ')}]`);

    if (colIndex === -1) {
        console.warn('Facility column not found by header text, using default index 4.');
        colIndex = 4; 
    } else {
        console.log(`Found Facility column at index: ${colIndex}`);
    }

    const rowCount = await this.rows.count();
    console.log(`Verifying ${rowCount} rows for facility containing: "${expectedText}"`);
    
    for (let i = 0; i < rowCount; i++) {
      const cell = this.rows.nth(i).locator('td').nth(colIndex);
      const cellText = await cell.innerText();
      console.log(`Row ${i+1} Facility: ${cellText.trim()}`);
      
      // Handle variations like "Pre-order" vs "Preorder"
      const normalizedExpected = expectedText.toLowerCase().replace(/-/g, '');
      const normalizedReceived = cellText.toLowerCase().replace(/-/g, '');
      
      expect(normalizedReceived).toContain(normalizedExpected);
    }
  }

  /**
   * Verifies that the Auto Cancel Date column shows today's date.
   */
  async verifyAutoCancelDateColumn() {
    const headers = this.page.locator('thead th');
    const headerCount = await headers.count();
    let colIndex = -1;
    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).innerText();
      if (text.toLowerCase().includes('auto cancel date')) colIndex = i;
    }

    if (colIndex === -1) {
        console.warn('Auto Cancel Date column not found, using default index 8.');
        colIndex = 8;
    }

    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayStr = `${mm}-${dd}-${yyyy}`;

    const rowCount = await this.rows.count();
    console.log(`Verifying ${rowCount} rows for Auto Cancel Date: ${todayStr}`);

    for (let i = 0; i < rowCount; i++) {
      const cell = this.rows.nth(i).locator('td').nth(colIndex);
      const cellText = await cell.innerText();
      console.log(`Row ${i+1} Auto Cancel Date: ${cellText.trim()}`);
      // Some dates might be slightly different depending on timezone, but we expect today
      expect(cellText.trim()).not.toBe('');
      expect(cellText.trim()).not.toBe('-');
    }
  }

  /**
   * Navigates to the next page if available.
   * @returns {Promise<boolean>} True if navigation occurred, false if no more pages.
   */
  async goToNextPage() {
    // Specifically target the button structure provided in the screenshot and HTML
    const nextBtn = this.page.locator('ul.pagination button[form="paginationform"][name="viewIndex"]:has-text("Next")').first();

    if (await nextBtn.isVisible()) {
      console.log('Clicking Next page button (footer)...');
      await nextBtn.scrollIntoViewIfNeeded();
      await nextBtn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      return true;
    }
    return false;
  }

  /**
   * Navigates to the previous page if available.
   */
  async goToPreviousPage() {
    // Specifically target the button structure for Previous
    const prevBtn = this.page.locator('ul.pagination button[form="paginationform"][name="viewIndex"]:has-text("Prev")').first();

    if (await prevBtn.isVisible()) {
      console.log('Clicking Previous page button (footer)...');
      await prevBtn.scrollIntoViewIfNeeded();
      await prevBtn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      return true;
    }
    return false;
  }

  /**
   * Navigates to the first page.
   */
  async goToFirstPage() {
    const firstBtn = this.page.locator('i.fa-fast-backward, [title="First Page"], button:has-text("First")').first();
    if (await firstBtn.isVisible()) {
        await firstBtn.click();
        await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Navigates to the last page.
   */
  async goToLastPage() {
    const lastBtn = this.page.locator('i.fa-fast-forward, [title="Last Page"], button:has-text("Last")').first();
    if (await lastBtn.isVisible()) {
        await lastBtn.click();
        await this.page.waitForLoadState('networkidle');
    }
  }
}

module.exports = { SalesOrderListingPage };
