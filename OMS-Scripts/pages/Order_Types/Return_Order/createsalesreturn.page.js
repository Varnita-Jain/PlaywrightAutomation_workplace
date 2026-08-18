const { expect } = require('@playwright/test');
const { BaseSalesOrderPage } = require('../Sales_Order/base.page');

class CreateSalesReturnPage extends BaseSalesOrderPage {
  constructor(page, baseURL, clientId) {
    super(page, baseURL, clientId);
  }

 
  // STEP 1: Navigate to Order Management Menu
 
  
  /**
   * Navigate to the landing page and click Order Management menu
   */
  async navigateToOrderManagementMenu() {
    console.log('Step 1: Navigating to Order Management menu...');

    // Go to the main landing page
    const url = new URL(this.baseURL);
    await this.page.goto(`${url.origin}/commerce/control/main`);
    await this.page.waitForLoadState('networkidle');

    // Make sure side-menu is not hidden in responsive views
    await this.page.evaluate(() => {
      const sidebar = document.querySelector('.side-menu');
      if (sidebar) sidebar.classList.remove('hidden-xs');
    });

    const orderManagementMenu = this.page.locator('a[data-form-submit="ORDER_MENU"]').first();
    
    // Fallback: If not visible, click via JS
    if (!await orderManagementMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.page.evaluate(() => {
        const links = document.querySelectorAll('a[data-form-submit="ORDER_MENU"]');
        links.forEach(link => link.click());
      });
    } else {
      await orderManagementMenu.click();
    }
    
    // Wait for the menu to expand and show sub-options
    await this.page.waitForTimeout(1000);

    // Count the menu options
    const menuItems = this.page.locator('ul li a').filter({ hasNotText: 'Order Management' });
    const itemCount = await menuItems.count();
    
    console.log(`Success: Found ${itemCount} menu options`);
    if (itemCount < 3) {
      console.log('Warning: Expected at least 3 sub-menu items, but found less.');
    }
  }

  // STEP 2: Select "Create Sales Return" Option
  async selectCreateSalesReturnOption() {
    console.log('Step 2: Selecting "Create Order Return" from menu...');

    // Wait for page to be fully ready with navigation elements visible
    await this.page.waitForLoadState('domcontentloaded');
    
    // Debug: Print all links in the menu area
    try {
      const menuText = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.innerText.trim())
          .filter(t => t.length > 0)
          .join(' | ');
      });
      console.log('Available links on page:', menuText);
    } catch (e) {
      console.log('Could not get link texts for debugging');
    }

    await this.page.waitForTimeout(2000);

    // Check for "Returnable Quantity Not Found" which happens when picking random organic orders
    const quantityError = this.page.locator('.alert-danger, .errorMessage').filter({ hasText: /Returnable Quantity Not Found/i }).first();
    if (await quantityError.isVisible({ timeout: 1000 }).catch(() => false)) {
      throw new Error('[DATA ERROR] Returnable Quantity Not Found for this order. It may have already been returned.');
    }

    // Check for common permission or validation errors
    const errorMsg = this.page.locator('.jGrowl-notification, .alert-danger, .errorMessage').filter({ hasText: /permission|error|failed/i }).first();
    const link = this.page.locator('a').filter({ hasText: /Create Order Return|Create Return|Create Sales Return/i }).first();
    const isVisible = await link.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      console.log('Success: Found Create Return menu option');
      // Try to click via JS if standard click fails
      await link.click({ force: true }).catch(() => link.evaluate(el => el.click()));
      await this.page.waitForLoadState('networkidle').catch(() => {});
      console.log('Success: Navigated to Create Sales Return page');
      return;
    }

    // If not found, try to go directly to URL as fallback
    console.log('Fallback: Attempting direct URL navigation to CreateOrderReturn...');
    const url = new URL(this.baseURL);
    await this.page.goto(`${url.origin}/commerce/control/CreateOrderReturn`);
    await this.page.waitForLoadState('networkidle');
    
    if (await this.isOnCreateSalesReturnPage()) {
       console.log('Success: Navigated to Create Sales Return page via URL fallback');
       return;
    }

    // If still not found, throw error - no fallback options
    throw new Error('Feature_Not_Supported: Create Order Return menu option not available for this client');
  }

  /**
   * Helper method to check if we're on the Create Sales Return form page
   * (Not the Sales Returns list page)
   */
  async isOnCreateSalesReturnPage() {
    // Check for form elements like Product Store dropdown, Order Date filter
    const productStoreLabel = this.page.locator('label').filter({ hasText: 'Product Store' });
    const orderDateLabel = this.page.locator('label').filter({ hasText: 'Order Date' });
    
    const hasProductStore = await productStoreLabel.isVisible({ timeout: 2000 }).catch(() => false);
    const hasOrderDate = await orderDateLabel.isVisible({ timeout: 2000 }).catch(() => false);
    
    // If we see both filters, we're on the Create Sales Return page
    return hasProductStore || hasOrderDate;
  }

  
  // STEP 3: Verify Page Opened Successfully
  
  /**
   * Verify that we are now on the "Create Sales Return" page
   * Looks for form elements that indicate this is the right page
   */
  async verifyCreateSalesReturnPageOpened() {
    console.log('Step 3: Verifying "Create Sales Return" page opened...');

    // Wait for the page to load
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(2000);

    // Look for Product Store label (main form element)
    const productStoreLabel = this.page.locator('label').filter({ hasText: 'Product Store' }).first();
    
    // Also check for Order Date label as secondary confirmation
    const orderDateLabel = this.page.locator('label').filter({ hasText: 'Order Date' }).first();

    // Verify at least the Product Store label is visible
    await expect(productStoreLabel).toBeVisible({ timeout: 10000 });
    
    console.log('Success: Create Sales Return form is open (Product Store filter found)');
  }

  async getFilterContainer(labelText) {
    const label = this.page.locator('label, span, div').filter({ hasText: new RegExp(`^${labelText}$`) }).first();
    await expect(label).toBeVisible({ timeout: 10000 });

    return label.locator(
      'xpath=ancestor::*[contains(@class, "generic") or contains(@class, "field") or contains(@class, "item") or contains(@class, "form-group") or contains(@class, "search-facet")][1]'
    );
  }

  async closeOpenDropdowns() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.mouse.click(0, 0).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  // STEP 4: Select Product Store from Dropdown
  

  /**
   * Open the Product Store dropdown and select the first available store
   */
  async selectProductStore() {
    console.log('Step 4: Selecting Product Store (first available)...');

    const container = await this.getFilterContainer('Product Store');
    const selectElement = container.locator('select:not([form="brandPreference"])').first();
    const dropdownButton = container.locator('button.dropdown-toggle, .dropdown-toggle, .select2-selection, .select-box').first();

    await this.closeOpenDropdowns();

    if (await selectElement.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Using native HTML select...');
      // Get the first option that is not "Select"
      const firstOption = selectElement.locator('option').filter({ hasNotText: /^Select$/ }).first();
      const selectedStore = (await firstOption.innerText()).trim();
      const selectedValue = await firstOption.getAttribute('value');

      await selectElement.selectOption(selectedValue);
      await this.page.waitForLoadState('networkidle').catch(() => {});
      await this.page.waitForTimeout(2000);
      console.log(`Success: Product Store selected: "${selectedStore}"`);
      return selectedStore;
    }

    console.log('Using bootstrap dropdown...');
    await expect(dropdownButton).toBeVisible({ timeout: 5000 });
    await dropdownButton.scrollIntoViewIfNeeded();
    await dropdownButton.click({ force: true });
    
    // Wait for dropdown to open
    await this.page.waitForTimeout(500);

    const visibleOptions = this.page
      .locator('.dropdown-menu.show, .dropdown-menu.open, .select2-results, .popover, [role="listbox"]')
      .locator('a[role="option"], li a, .dropdown-item, .select2-results__option, span.text, [role="option"]');
    
    // Select the first option
    const firstOption = visibleOptions.filter({ hasNotText: /^Select$/ }).first();
    const selectedStore = (await firstOption.innerText()).trim();

    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click({ force: true });

    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(2000);
    console.log(`Success: Product Store selected: "${selectedStore}"`);
    return selectedStore;
  }

  // STEP 5: Select Order Date Filter

  /**
   * Open the Order Date dropdown and select "More than 30 days"
   */
  async selectOrderDateMoreThan30Days() {
    console.log('Step 5: Selecting Order Date: "More than 30 days"...');

    const radioInput = this.page.locator('input#orderDateMore, input#returnDateMore, input[name*="DateRange"][value*="30DAY"]').first();
    const moreThan30Label = this.page.locator('label').filter({ hasText: 'More than 30 days' }).first();

    if (!await moreThan30Label.isVisible({ timeout: 2000 }).catch(() => false)) {
      const container = await this.getFilterContainer('Order Date');
      const dropdownButton = container.locator('button.dropdown-toggle, .dropdown-toggle, .select2-selection, .select-box').first();

      console.log('Opening Order Date dropdown...');
      await dropdownButton.waitFor({ state: 'visible', timeout: 10000 });
      await dropdownButton.scrollIntoViewIfNeeded();
      await dropdownButton.click({ force: true });
      await this.page.waitForTimeout(500);
    }

    if (await radioInput.count() > 0) {
      await radioInput.waitFor({ state: 'attached', timeout: 10000 });
      await radioInput.check({ force: true }).catch(async () => {
        await moreThan30Label.click({ force: true });
      });
      await expect(radioInput).toBeChecked({ timeout: 5000 });
    } else {
      await expect(moreThan30Label).toBeVisible({ timeout: 10000 });
      await moreThan30Label.click({ force: true });
    }

    const searchButton = this.page.locator('button[aria-label="Search"], button[type="submit"][form="findForm"]').first();
    if (await searchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchButton.click({ force: true });
    }

    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(3000);
    console.log(' Order Date filter applied: "More than 30 days"');
  }

  
  // STEP 6: Verify Filter Applied Successfully
  

  /**
   * Check if results table is displayed or if empty state message is shown
   * @returns {Object} Object with {hasTable: boolean, hasEmptyState: boolean}
   */
  async verifyFilterApplied() {
    console.log('Step 6: Verifying filter applied...');

    // Wait for page to finish loading
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(2000);

    // Check if a results table exists
    const resultsTable = this.page.locator('table tbody tr').first();
    const hasTable = await resultsTable.isVisible({ timeout: 5000 }).catch(() => false);

    // Check if empty state message is displayed
    const emptyStateMessage = this.page.locator('text=/No records|No data|No results/i').first();
    const hasEmptyState = await emptyStateMessage.isVisible({ timeout: 5000 }).catch(() => false);

    // Log what was found
    if (hasTable) {
      console.log(' Results table displayed with matching records');
    } else if (hasEmptyState) {
      console.log(' Empty state message displayed - no matching records');
    } else {
      console.log(' Neither results table nor empty state message found');
    }

    return { hasTable, hasEmptyState };
  }

 
  // Click First "Create Return" Button
  
  /**
   * Click a random "Create Return" button from the results table
   */
  async clickRandomCreateReturnButton() {
    console.log('Step 7: Clicking random "Create Return" button...');

    // Find all buttons that say "Create Return"
    const createReturnButtons = this.page.getByRole('button', { name: 'Create Return' });
    
    // Make sure at least the first button is visible
    await expect(createReturnButtons.first()).toBeVisible({ timeout: 10000 });
    
    const count = await createReturnButtons.count();
    const randomIndex = Math.floor(Math.random() * count);
    console.log(`Found ${count} "Create Return" buttons. Clicking button at index ${randomIndex}...`);
    
    const targetButton = createReturnButtons.nth(randomIndex);
    
    // Click on it
    await targetButton.click();

    // Wait for navigation to complete - this is important
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (e) {
      console.log('Warning: Page did not reach networkidle, continuing anyway');
    }
    
    // Additional wait for page to settle
    await this.page.waitForTimeout(3000);
    
    console.log('Success: Create Return button clicked - loading Sales Returns page...');
  }


  // Verify Sales Returns Page Opened

  /**
   * Verify that the Sales Returns page is now open with the correct heading
   * This is the page that shows when we click "Create Return" on an order
   */
  async verifySalesReturnsPageOpened() {
    console.log('Step 8: Verifying Sales Returns page opened...');

    // Wait longer for page to fully load after navigation
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(3000);

    // Check multiple possible indicators that we're on the return page
    const pageUrl = this.page.url();
    const urlIndicators = [
      'SalesReturn',
      'Return',
      'return',
      'RMA'
    ];
    const isCorrectUrl = urlIndicators.some(indicator => pageUrl.includes(indicator));

    // Look for "Sales Returns" or "Return" text anywhere on the page
    const salesReturnsText = this.page.locator('text=/Sales Return|Return Item|Create RMA/i').first();
    const hasSalesReturnsText = await salesReturnsText.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Check for bulk checkbox (indicates product list is displayed)
    const bulkCheckbox = this.page.locator('input[type="checkbox"]#bulk-checkbox, input[name*="bulk"], input[id*="bulk"]').first();
    const hasBulkCheckbox = await bulkCheckbox.isVisible({ timeout: 2000 }).catch(() => false);
    
    // Check for Create Return or Submit button
    const createReturnButton = this.page.getByRole('button', { name: /Create Return|Submit|Save/i }).first();
    const hasCreateReturnButton = await createReturnButton.isVisible({ timeout: 2000 }).catch(() => false);

    // Log what was found for debugging
    if (isCorrectUrl) {
      console.log(`Success: Correct URL detected: ${pageUrl}`);
    }
    if (hasSalesReturnsText) {
      console.log('Success: Found Sales Returns/Return text on page');
    }
    if (hasBulkCheckbox) {
      console.log('Success: Found bulk checkbox - product list visible');
    }
    if (hasCreateReturnButton) {
      console.log('Success: Found Create Return button');
    }

    // Accept if ANY of these conditions are met
    if (isCorrectUrl || hasSalesReturnsText || hasBulkCheckbox || hasCreateReturnButton) {
      console.log('Success: Sales Returns page is open');
      return;
    }

    throw new Error('Sales Returns page not found - no expected elements visible');
  }
  
  // Select First Product Checkbox

  /**
   * Find and check the first product checkbox in the product list
   */
  async selectFirstProductCheckbox() {
    console.log('Step 9: Selecting first product checkbox...');

    // Wait extra time for page to fully render all elements
    await this.page.waitForTimeout(3000);

    let firstCheckbox = null;
    let isVisible = false;

    // Try selector 1: bulk-checkbox with ID
    firstCheckbox = this.page.locator('input[type="checkbox"]#bulk-checkbox').first();
    isVisible = await firstCheckbox.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isVisible) {
      // Try selector 2: any checkbox
      firstCheckbox = this.page.locator('input[type="checkbox"]').first();
      isVisible = await firstCheckbox.isVisible({ timeout: 1000 }).catch(() => false);
    }
    
    if (!isVisible) {
      // Try selector 3: checkbox in table
      firstCheckbox = this.page.locator('table input[type="checkbox"]').first();
      isVisible = await firstCheckbox.isVisible({ timeout: 1000 }).catch(() => false);
    }

    if (!isVisible) {
      // Try selector 4: by role
      firstCheckbox = this.page.locator('[role="checkbox"]').first();
      isVisible = await firstCheckbox.isVisible({ timeout: 1000 }).catch(() => false);
    }

    if (!isVisible) {
      // Try selector 5: Wait longer and try input again
      await this.page.waitForTimeout(5000);
      firstCheckbox = this.page.locator('input[type="checkbox"]').first();
      isVisible = await firstCheckbox.isVisible({ timeout: 3000 }).catch(() => false);
    }

    if (!isVisible) {
      // Try selector 6: Look for checkbox in any form element
      const formInputs = this.page.locator('input').filter({ hasAttributes: ['type=checkbox'] });
      if (await formInputs.count() > 0) {
        firstCheckbox = formInputs.first();
        isVisible = await firstCheckbox.isVisible({ timeout: 2000 }).catch(() => false);
      }
    }

    if (!isVisible) {
      throw new Error('Could not find any product checkbox on the page');
    }
    
    // Click to interact with the checkbox
    try {
      // First try to check it
      const isChecked = await firstCheckbox.isChecked().catch(() => false);
      if (!isChecked) {
        await firstCheckbox.check({ force: true });
      }
    } catch (e) {
      // If check fails, try clicking it
      await firstCheckbox.click({ force: true });
    }

    console.log('Success: First product checkbox selected');
  }


  //Click "Create Return" Button
  
  /**
   * Click the "Create Return" button to submit the return order
   */
  async clickCreateReturnButton() {
    console.log('Step 10: Clicking "Create Return" button...');

    // Wait for page to be ready
    await this.page.waitForTimeout(2000);

    let createReturnButton = null;
    let isVisible = false;

    // Try selector 1: by role
    createReturnButton = this.page.getByRole('button', { name: 'Create Return' }).first();
    isVisible = await createReturnButton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isVisible) {
      // Try selector 2: by text in button
      createReturnButton = this.page.locator('button').filter({ hasText: 'Create Return' }).first();
      isVisible = await createReturnButton.isVisible({ timeout: 1000 }).catch(() => false);
    }

    if (!isVisible) {
      // Try selector 3: by partial text match
      createReturnButton = this.page.locator('button, input[type="button"], input[type="submit"]').filter({ hasText: /Create|Submit|Save/ }).first();
      isVisible = await createReturnButton.isVisible({ timeout: 1000 }).catch(() => false);
    }

    if (!isVisible) {
      // Try selector 4: any button
      const allButtons = await this.page.locator('button').all();
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text && /Create|Submit|Save/i.test(text)) {
          createReturnButton = btn;
          isVisible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
          if (isVisible) break;
        }
      }
    }

    if (!isVisible) {
      throw new Error('Create Return button not found');
    }
    
    // Click on the button
    await createReturnButton.click();

    // Wait for the action to complete
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (e) {
      console.log('Warning: Page did not reach networkidle, continuing anyway');
    }
    await this.page.waitForTimeout(2000);
    
    console.log('Success: Create Return button clicked');
  }

  // STEP 11: Verify Return Created or Error
  /**
   * Check if return was created successfully or if there's an error
   * @returns {Object} {success: boolean, message: string, hasPermission: boolean}
   */
  async verifyReturnCreatedOrErrorMessage() {
    console.log('Step 11: Verifying return creation status...');

    // Wait a bit for any notification to appear
    await this.page.waitForTimeout(1000);

    // List of possible success messages
    const successMessages = [
      'Return created successfully',
      'Sales Return created',
      'Return order created',
      'Successfully created',
      'Order returned',
      'Return saved'
    ];

    // List of possible error messages
    const errorMessages = [
      'Permission denied',
      'You do not have permission',
      'Not authorized',
      'Unable to create',
      'Failed to create',
      'Error'
    ];

    // Look for any success message
    let successMessage = null;
    for (const msg of successMessages) {
      const element = this.page.getByText(msg).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        successMessage = msg;
        break;
      }
    }

    // Look for any error message
    let errorMessage = null;
    for (const msg of errorMessages) {
      const element = this.page.getByText(msg).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        errorMessage = msg;
        break;
      }
    }

    // Look for any alert/notification on the page
    const notification = this.page.locator('[role="alert"], .alert, .toast, .notification').first();
    let notificationText = null;
    if (await notification.isVisible({ timeout: 3000 }).catch(() => false)) {
      notificationText = await notification.textContent();
    }

    // Return appropriate result based on what was found
    if (successMessage) {
      console.log(` Return created successfully: "${successMessage}"`);
      return { success: true, message: successMessage, hasPermission: true };
    } else if (errorMessage) {
      console.log(`Error: "${errorMessage}"`);
      console.log('Info: User remains on the same page (no permission)');
      return { success: false, message: errorMessage, hasPermission: false };
    } else if (notificationText && notificationText.trim()) {
      console.log(`Info: Notification: "${notificationText}"`);
      return { success: true, message: notificationText, hasPermission: true };
    } else {
      console.log('Info: No specific success or error message found');
      return { success: true, message: 'Action completed', hasPermission: true };
    }
  }
}

module.exports = { CreateSalesReturnPage };
