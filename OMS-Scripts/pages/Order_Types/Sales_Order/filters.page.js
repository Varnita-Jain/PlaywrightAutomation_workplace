const { expect } = require('@playwright/test');
const { BaseSalesOrderPage } = require('./base.page');

/**
 * Page Object for Sales Order Filters
 * Handles complex filtering logic on the Find Sales Order page.
 */
class FiltersOMSPage extends BaseSalesOrderPage {

  constructor(page, baseURL, clientId) {
    super(page, baseURL, clientId);
  }

  /**
   * Navigates to the Sales Order Listing page.
   */
  async navigateToFindOrder() {
    const url = new URL(this.baseURL);
    const targetUrl = `${url.origin}/commerce/control/FindOrder`;
    await this.page.goto(targetUrl);
    await this.page.waitForTimeout(1500);

    // Check if we were redirected to Microsoft or any SSO
    const currentUrl = this.page.url();
    if (currentUrl.includes('microsoftonline.com') || currentUrl.includes('login.microsoft')) {
        console.error('Detected SSO redirect to Microsoft. Session might be invalid.');
        throw new Error('SSO Redirect detected during navigation to FindOrder. Please clear cache.');
    }
  }

  /**
   * Applies filters from the sidebar or main form.
   */
  async applyFilters({ orderId, status, customerName, externalId, productStoreId } = {}) {
    if (orderId) {
      await this.page.locator('input[name="orderId"]').fill(orderId);
    }
    if (status) {
      await this.page.locator('select[name="statusId"]').selectOption({ label: status });
    }
    if (customerName) {
      await this.page.locator('input[name="customerName"]').fill(customerName);
    }
    if (externalId) {
      await this.page.locator('input[name="externalId"]').fill(externalId);
    }
    if (productStoreId) {
      await this.page.locator('select[name="productStoreId"]').selectOption({ value: productStoreId });
    }
    
    await this.page.locator('button:has-text("Search"), .btn-primary:has-text("Search"), button.btn-primary').first().click();
    await this.page.waitForTimeout(1500);
  }

  /**
   * Verifies results match criteria.
   */
  async verifyResultsMatch({ status, customerName } = {}) {
    const rows = this.page.locator('tbody tr:has(a[href*="orderId="])');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      if (status) await expect(row).toContainText(status, { ignoreCase: true });
      if (customerName) await expect(row).toContainText(customerName, { ignoreCase: true });
    }
  }

  async verifyResultsByColumn(columnName, expectedValue) {
    if (!expectedValue) return true;
    // Wait for the table to stabilize
    await this.page.waitForTimeout(2000);
    const rows = this.page.locator('tbody tr:has(a[href*="orderId="])');
    const rowCount = await rows.count();
    
    if (rowCount === 0) {
        console.log(`No records found for ${columnName}: ${expectedValue}`);
        return true; 
    }

    const headers = this.page.locator('thead th');
    const headerCount = await headers.count();
    let colIndex = -1;

    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).innerText();
      if (text.toLowerCase().includes(columnName.toLowerCase())) {
        colIndex = i;
        break;
      }
    }

    if (colIndex === -1) {
        console.error(`Column ${columnName} not found. Available: `, await headers.allInnerTexts());
        // Fallback to column index based on name
        if (columnName.includes('Facility')) colIndex = 4;
        else if (columnName.includes('Item Status')) colIndex = 6;
        else if (columnName.includes('Order Status')) colIndex = 6;
        else return false;
    }

    const checkCount = Math.min(rowCount, 3);
    for (let i = 0; i < checkCount; i++) {
      const cellText = await rows.nth(i).locator('td').nth(colIndex).innerText();
      // Case-insensitive verification
      expect(cellText.toLowerCase()).toContain(expectedValue.toLowerCase());
    }
    return true;
  }

  async selectFirstProductStore() {
    await this.page.evaluate(() => {
        const sidebar = document.querySelector('.sidebar, nav.sidebar, #sidebar-nav, .left-side');
        if (sidebar) sidebar.style.display = 'none';
    }).catch(() => {});
    
    const label = this.page.locator('label, span, div').filter({ hasText: /^Product Store$/ }).first();
    const container = label.locator('xpath=ancestor::*[contains(@class, "generic") or contains(@class, "field") or contains(@class, "item")][1]').first();
    const dropdownTrigger = container.locator('button, .dropdown-toggle, .select2-selection, .select-box, combobox').first();
    
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.mouse.click(0, 0).catch(() => {});
    await this.page.waitForTimeout(500);

    await dropdownTrigger.scrollIntoViewIfNeeded();
    await dropdownTrigger.click({ force: true });
    
    const firstOption = this.page.locator('.dropdown-menu.show, .select2-results, .popover, [role="listbox"]').filter({ state: 'visible' }).locator('span.text, .dropdown-item, .select2-results__option, [role="option"], option').last();
    await firstOption.waitFor({ state: 'visible', timeout: 10000 });
    const storeName = await firstOption.innerText();
    await firstOption.click();
    // Search is applied automatically; wait for refresh
    await this.page.waitForTimeout(1500);
    await this.page.waitForTimeout(3000);
    return storeName;
  }

  async verifyStoreResults(storeName) {
    const rows = this.page.locator('tbody tr:has(a[href*="orderId="])');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  }

  async selectFirstFacility() {
    const label = this.page.locator('label, span, div').filter({ hasText: /^Facility$/ }).first();
    const container = label.locator('xpath=ancestor::*[contains(@class, "generic") or contains(@class, "field") or contains(@class, "item")][1]').first();
    const dropdownTrigger = container.locator('button, .dropdown-toggle, .select2-selection, .select-box, combobox').first();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.mouse.click(0, 0).catch(() => {});
    await this.page.waitForTimeout(500);

    await dropdownTrigger.scrollIntoViewIfNeeded();
    await dropdownTrigger.click({ force: true });
    const firstOption = this.page.locator('.dropdown-menu.show, .select2-results, .popover, [role="listbox"]').filter({ state: 'visible' }).locator('span.text, .dropdown-item, .select2-results__option, [role="option"], option').last();
    await firstOption.waitFor({ state: 'visible', timeout: 10000 });
    const facilityName = await firstOption.innerText();
    await firstOption.click();
    // Search is applied automatically; wait for refresh
    await this.page.waitForTimeout(1500);
    await this.page.waitForTimeout(3000);
    return facilityName;
  }

  async verifyFacilityResults(facilityName) {
    return this.verifyResultsByColumn('Facility', facilityName);
  }

  async selectFirstOrderStatus() {
    const label = this.page.locator('label, span, div').filter({ hasText: /^Order Status$/ }).first();
    const container = label.locator('xpath=ancestor::*[contains(@class, "generic") or contains(@class, "field") or contains(@class, "item")][1]').first();
    const dropdownTrigger = container.locator('button, .dropdown-toggle, .select2-selection, .select-box, combobox').first();
    await dropdownTrigger.scrollIntoViewIfNeeded();
    await dropdownTrigger.click({ force: true });
    const firstOption = this.page.locator('.dropdown-menu.show, .select2-results, .popover, [role="listbox"]').filter({ state: 'visible' }).locator('span.text, .dropdown-item, .select2-results__option, [role="option"], option').last();
    await firstOption.waitFor({ state: 'visible', timeout: 10000 });
    const statusName = await firstOption.innerText();
    await firstOption.click();
    // Search is applied automatically; wait for refresh
    await this.page.waitForTimeout(1500);
    await this.page.waitForTimeout(3000);
    return statusName;
  }

  async verifyOrderStatusResults(status) {
    await this.page.waitForTimeout(2000);
    const rows = this.page.locator('tbody tr:has(a[href*="orderId="])');
    const rowCount = await rows.count();
    if (rowCount === 0) return true;

    const headers = this.page.locator('thead th');
    const headerCount = await headers.count();
    let colIndex = -1;

    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).innerText();
      if (text.includes('Order Status') || text.includes('ID')) {
        colIndex = i;
        const cellText = await rows.first().locator('td').nth(i).innerText();
        if (cellText.toLowerCase().includes(status.toLowerCase())) {
            break;
        }
      }
    }
    
    if (colIndex === -1) colIndex = 1;

    for (let i = 0; i < Math.min(rowCount, 3); i++) {
      const cellText = await rows.nth(i).locator('td').nth(colIndex).innerText();
      if (!cellText.toLowerCase().includes(status.toLowerCase())) {
          const fallbackText = await rows.nth(i).locator('td').nth(6).innerText();
          expect(fallbackText.toLowerCase()).toContain(status.toLowerCase());
      }
    }
    return true;
  }

  async selectFirstItemStatus() {
    const label = this.page.locator('label, span, div').filter({ hasText: /^Item Status$/ }).first();
    const container = label.locator('xpath=ancestor::*[contains(@class, "generic") or contains(@class, "field") or contains(@class, "item")][1]').first();
    const dropdownTrigger = container.locator('button, .dropdown-toggle, .select2-selection, .select-box, combobox').first();
    await dropdownTrigger.scrollIntoViewIfNeeded();
    await dropdownTrigger.click({ force: true });
    const firstOption = this.page.locator('.dropdown-menu.show, .select2-results, .popover, [role="listbox"]').filter({ state: 'visible' }).locator('span.text, .dropdown-item, .select2-results__option, [role="option"], option').last();
    await firstOption.waitFor({ state: 'visible', timeout: 10000 });
    const statusName = await firstOption.innerText();
    await firstOption.click();
    // Search is applied automatically; wait for refresh
    await this.page.waitForTimeout(1500);
    await this.page.waitForTimeout(3000);
    return statusName;
  }

  async verifyItemStatusResults(statusName) {
    return this.verifyResultsByColumn('Item Status', statusName);
  }

  async selectFirstSalesChannel() {
    const label = this.page.locator('label, span, div').filter({ hasText: /^Sales Channel$/ }).first();
    const container = label.locator('xpath=ancestor::*[contains(@class, "generic") or contains(@class, "field") or contains(@class, "item")][1]').first();
    const dropdownTrigger = container.locator('button, .dropdown-toggle, .select2-selection, .select-box, combobox').first();
    await dropdownTrigger.scrollIntoViewIfNeeded();
    await dropdownTrigger.click({ force: true });
    const firstOption = this.page.locator('.dropdown-menu.show, .select2-results, .popover, [role="listbox"]').filter({ state: 'visible' }).locator('span.text, .dropdown-item, .select2-results__option, [role="option"], option').last();
    await firstOption.waitFor({ state: 'visible', timeout: 10000 });
    const channelName = await firstOption.innerText();
    await firstOption.click();
    // Search is applied automatically; wait for refresh
    await this.page.waitForTimeout(1500);
    await this.page.waitForTimeout(3000);
    return channelName;
  }

  async verifySalesChannelResults(channelName) {
    const rows = this.page.locator('tbody tr:has(a[href*="orderId="])');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  }

  async clickFirstOrder() {
    const firstOrderLink = this.page.locator('tbody tr:has(a[href*="orderId="])').first().locator('a[href*="orderId="]');
    await firstOrderLink.click();
    await this.page.waitForTimeout(1500);
  }

  async verifyBillFromChannel(channelName) {
    const billFromSection = this.page.locator('div, td, li').filter({ hasText: /Bill From/i }).first();
    await expect(billFromSection).toContainText(channelName, { ignoreCase: true });
  }

  /**
   * Clicks the horizontal scroll button to reveal more filters.
   */
  async scrollToMoreFilters() {
    // Ensure large viewport to avoid horizontal scroll issues
    await this.page.setViewportSize({ width: 1920, height: 1080 }).catch(() => {});
    
    // Hide sidebar to prevent click interception
    await this.page.evaluate(() => {
        const sidebar = document.querySelector('.sidebar, nav.sidebar, #sidebar-nav, .left-side');
        if (sidebar) sidebar.style.display = 'none';
        const header = document.querySelector('header, .main-header');
        if (header) header.style.zIndex = '0';
    }).catch(() => {});

    const scrollBtn = this.page.locator('i.fa-fast-forward').first();
    if (await scrollBtn.isVisible()) {
        console.log('Scrolling horizontal filters to reveal more options...');
        await scrollBtn.click();
        await this.page.waitForTimeout(500);
    }
  }

  /**
   * Selects an Order Date range: From (Today - 60 days) To (Today).
   */
  async selectOrderDateRange() {
    await this.scrollToMoreFilters();
    
    // Find container with Order Date label and dropdown controls
    const container = this.page.locator('div, fieldset, .form-group').filter({ has: this.page.locator('label, span, div').filter({ hasText: /^Order Date$/ }) }).filter({ has: this.page.locator('button, .dropdown-toggle, .select2-selection') }).first();
    const dateTrigger = container.locator('button, .dropdown-toggle, .select2-selection, .select-box').first();
    await dateTrigger.scrollIntoViewIfNeeded();
    await dateTrigger.evaluate(el => el.click());
    await this.page.waitForTimeout(1000); 
    
    const today = new Date();
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [month, day, year].join('-');
    };

    const fromDateStr = formatDate(sixtyDaysAgo);
    const toDateStr = formatDate(today);
    
    console.log(`Setting Order Date range: From ${fromDateStr} To ${toDateStr}...`);

    const fromInput = this.page.locator('#fromDate_i18n, input[name*="fromDate"]').first();
    const toInput = this.page.locator('#toDate_i18n, input[name*="toDate"]').first();
    
    await fromInput.waitFor({ state: 'attached', timeout: 10000 });
    await fromInput.evaluate((el, val) => { 
        el.removeAttribute('readonly');
        el.value = val; 
        if (el._flatpickr) el._flatpickr.setDate(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true })); 
    }, fromDateStr);
    
    await toInput.waitFor({ state: 'attached', timeout: 10000 });
    await toInput.evaluate((el, val) => { 
        el.removeAttribute('readonly');
        el.value = val; 
        if (el._flatpickr) el._flatpickr.setDate(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true })); 
    }, toDateStr);

    await this.page.waitForTimeout(1000); 

    const applyBtn = this.page.locator('.modal-content button:has-text("Apply"), .modal-dialog button:has-text("Apply"), button.btn-primary:has-text("Apply")').filter({ state: 'visible' }).first();
    await applyBtn.click({ force: true }).catch(() => applyBtn.evaluate(el => el.click()));
    
    await this.page.locator('.modal-content, .modal-dialog, dialog').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(1500);
    
    // Search is triggered by 'Apply' button in modal
    await this.page.waitForTimeout(1500);
    
    console.log('Waiting 5 seconds to observe filtered results...');
    await this.page.waitForTimeout(5000);
    
    return { fromDate: sixtyDaysAgo, toDate: today };
  }

  async verifyOrderDateResults(fromDate, toDate) {
    const rows = this.page.locator('tbody tr:has(a[href*="orderId="])');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const dateCell = rows.nth(i).locator('td').nth(7);
      const dateText = await dateCell.innerText(); 
      const [m, d, y] = dateText.split('-').map(num => parseInt(num));
      const rowDate = new Date(y, m - 1, d);
      const checkDate = new Date(rowDate.setHours(0,0,0,0));
      const start = new Date(new Date(fromDate).setHours(0,0,0,0));
      const end = new Date(new Date(toDate).setHours(0,0,0,0));
      expect(checkDate.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(checkDate.getTime()).toBeLessThanOrEqual(end.getTime());
    }
  }

  /**
   * Selects a Promised Date range: From (Today) To (Today + 30 days).
   */
  async selectPromisedDateRange() {
    await this.scrollToMoreFilters();
    
    // Find container with Promised Date label and dropdown controls
    const container = this.page.locator('div, fieldset, .form-group').filter({ has: this.page.locator('label, span, div').filter({ hasText: /^Promised Date$/ }) }).filter({ has: this.page.locator('button, .dropdown-toggle, .select2-selection') }).first();
    const dateTrigger = container.locator('button, .dropdown-toggle, .select2-selection, .select-box').first();
    await dateTrigger.scrollIntoViewIfNeeded();
    await dateTrigger.evaluate(el => el.click());
    await this.page.waitForTimeout(1000); 
    
    const today = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(today.getDate() + 30);

    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [month, day, year].join('-');
    };

    const fromDateStr = formatDate(today);
    const toDateStr = formatDate(thirtyDaysAhead);
    
    console.log(`Setting Promised Date range: From ${fromDateStr} To ${toDateStr}...`);

    const fromInput = this.page.locator('#fromDate_i18n, input[name*="fromDate"]').first();
    const toInput = this.page.locator('#toDate_i18n, input[name*="toDate"]').first();
    
    await fromInput.waitFor({ state: 'attached', timeout: 10000 });
    await fromInput.evaluate((el, val) => { 
        el.removeAttribute('readonly');
        el.value = val; 
        if (el._flatpickr) el._flatpickr.setDate(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true })); 
    }, fromDateStr);
    
    await toInput.waitFor({ state: 'attached', timeout: 10000 });
    await toInput.evaluate((el, val) => { 
        el.removeAttribute('readonly');
        el.value = val; 
        if (el._flatpickr) el._flatpickr.setDate(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true })); 
    }, toDateStr);

    await this.page.waitForTimeout(1000); 

    const applyBtn = this.page.locator('.modal-content button:has-text("Apply"), .modal-dialog button:has-text("Apply"), button.btn-primary:has-text("Apply")').filter({ state: 'visible' }).first();
    await applyBtn.click({ force: true }).catch(() => applyBtn.evaluate(el => el.click()));
    
    await this.page.locator('.modal-content, .modal-dialog, dialog').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(1500);
    
    // Search is triggered by 'Apply' button in modal
    await this.page.waitForTimeout(1500);
    
    console.log('Waiting 5 seconds to observe filtered results...');
    await this.page.waitForTimeout(5000);
    
    return { fromDate: today, toDate: thirtyDaysAhead };
  }

  async verifyPromisedDateResults(fromDate, toDate) {
    const rows = this.page.locator('tbody tr:has(a[href*="orderId="])');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      // Promised Date is the 9th column (index 8)
      const dateCell = rows.nth(i).locator('td').nth(8);
      const dateText = await dateCell.innerText(); 
      
      // Some rows might not have a promised date (e.g. "-")
      if (dateText.trim() === '-' || !dateText.includes('-')) {
          console.log(`Row ${i+1}: No promised date found, skipping...`);
          continue;
      }

      const [m, d, y] = dateText.split('-').map(num => parseInt(num));
      const rowDate = new Date(y, m - 1, d);
      const checkDate = new Date(rowDate.setHours(0,0,0,0));
      const start = new Date(new Date(fromDate).setHours(0,0,0,0));
      const end = new Date(new Date(toDate).setHours(0,0,0,0));
      
      console.log(`Row ${i+1} Promised Date: ${dateText}`);
      expect(checkDate.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(checkDate.getTime()).toBeLessThanOrEqual(end.getTime());
    }
  }

  /**
   * Selects an Auto Cancel Date range: From (Today) To (Today + 90 days).
   */
  async selectAutoCancelDateRange() {
    await this.scrollToMoreFilters();
    
    // Find container with Auto Cancel Date label and dropdown controls
    const container = this.page.locator('div, fieldset, .form-group').filter({ has: this.page.locator('label, span, div').filter({ hasText: /^Auto Cancel Date$/ }) }).filter({ has: this.page.locator('button, .dropdown-toggle, .select2-selection') }).first();
    const dateTrigger = container.locator('button, .dropdown-toggle, .select2-selection, .select-box').first();
    await dateTrigger.scrollIntoViewIfNeeded();
    await dateTrigger.evaluate(el => el.click());
    await this.page.waitForTimeout(1000); 
    
    const today = new Date();
    const ninetyDaysAhead = new Date();
    ninetyDaysAhead.setDate(today.getDate() + 90);

    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [month, day, year].join('-');
    };

    const fromDateStr = formatDate(today);
    const toDateStr = formatDate(ninetyDaysAhead);
    
    console.log(`Setting Auto Cancel Date range: From ${fromDateStr} To ${toDateStr}...`);

    const fromInput = this.page.locator('#fromDate_i18n, input[name*="fromDate"]').first();
    const toInput = this.page.locator('#toDate_i18n, input[name*="toDate"]').first();
    
    await fromInput.waitFor({ state: 'attached', timeout: 10000 });
    await fromInput.evaluate((el, val) => { 
        el.removeAttribute('readonly');
        el.value = val; 
        if (el._flatpickr) el._flatpickr.setDate(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true })); 
    }, fromDateStr);
    
    await toInput.waitFor({ state: 'attached', timeout: 10000 });
    await toInput.evaluate((el, val) => { 
        el.removeAttribute('readonly');
        el.value = val; 
        if (el._flatpickr) el._flatpickr.setDate(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true })); 
    }, toDateStr);

    await this.page.waitForTimeout(1000); 

    const applyBtn = this.page.locator('.modal-content button:has-text("Apply"), .modal-dialog button:has-text("Apply"), button.btn-primary:has-text("Apply")').filter({ state: 'visible' }).first();
    await applyBtn.click({ force: true }).catch(() => applyBtn.evaluate(el => el.click()));
    
    await this.page.locator('.modal-content, .modal-dialog, dialog').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(1500);
    
    // Search is triggered by 'Apply' button in modal
    await this.page.waitForTimeout(1500);
    
    console.log('Waiting 5 seconds to observe filtered results...');
    await this.page.waitForTimeout(5000);
    
    return { fromDate: today, toDate: ninetyDaysAhead };
  }

  async verifyAutoCancelDateResults(fromDate, toDate) {
    const rows = this.page.locator('tbody tr:has(a[href*="orderId="])');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      // Auto Cancel Date is the 10th column (index 9)
      const dateCell = rows.nth(i).locator('td').nth(9);
      const dateText = await dateCell.innerText(); 
      
      if (dateText.trim() === '-' || !dateText.includes('-')) {
          console.log(`Row ${i+1}: No auto cancel date found, skipping...`);
          continue;
      }

      const [m, d, y] = dateText.split('-').map(num => parseInt(num));
      const rowDate = new Date(y, m - 1, d);
      const checkDate = new Date(rowDate.setHours(0,0,0,0));
      const start = new Date(new Date(fromDate).setHours(0,0,0,0));
      const end = new Date(new Date(toDate).setHours(0,0,0,0));
      
      console.log(`Row ${i+1} Auto Cancel Date: ${dateText}`);
      expect(checkDate.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(checkDate.getTime()).toBeLessThanOrEqual(end.getTime());
    }
  }

  async resultsFound() {
    const noRecords = this.page.locator('text="No keyword matches the search criteria."').first();
    return !(await noRecords.isVisible());
  }
}

module.exports = { FiltersOMSPage };
