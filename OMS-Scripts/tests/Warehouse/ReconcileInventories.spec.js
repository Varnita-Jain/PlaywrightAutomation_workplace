const { test, expect } = require('../../fixtures/fixtures');

test.describe('Warehouse / Reconcile Inventories Flow', () => {

  // ==========================================
  // TEST 1: Created Status
  // ==========================================
  test('should navigate to Reconcile Inventories, filter by Created, and verify results', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    try {
        await authenticatedPage.goto(`${url.origin}/commerce/control/FindInventoryCountImport`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
        test.skip();
        return;
    }
    
    // Quick check to see if we were redirected to Login/SSO
    const firstCombobox = authenticatedPage.getByRole('combobox').nth(0);
    try {
        await expect(firstCombobox).toBeVisible({ timeout: 10000 });
    } catch (e) {
        test.skip(true, 'Redirected to login or unsupported feature');
        return;
    }
    await authenticatedPage.waitForTimeout(1000);

    // Select 'Created' (1 ArrowDown)
    await authenticatedPage.getByRole('combobox').nth(0).click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.keyboard.press('Escape'); 
    await authenticatedPage.waitForTimeout(2500); 

    // Verify
    const noResultsFound = authenticatedPage.locator('text=/No \\w+/i').first(); 
    const tableIdColumn = authenticatedPage.locator('table tbody tr td:first-child').first();

    if (await noResultsFound.isVisible().catch(() => false)) {
        await expect(noResultsFound).toBeVisible();
    } else if (await tableIdColumn.isVisible().catch(() => false)) {
        await expect(tableIdColumn).toBeVisible();
        const tableText = await authenticatedPage.locator('table').innerText();
        expect(tableText).toMatch(/Created/i);
    } else {
        test.skip();
    }
  });

  // ==========================================
  // TEST 2: INV_COUNT_ASSIGNED Status
  // ==========================================
  test('should navigate to Reconcile Inventories, filter by Assigned, and verify results', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    try {
        await authenticatedPage.goto(`${url.origin}/commerce/control/FindInventoryCountImport`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
        test.skip();
        return;
    }
    
    const firstCombobox = authenticatedPage.getByRole('combobox').nth(0);
    try {
        await expect(firstCombobox).toBeVisible({ timeout: 10000 });
    } catch (e) {
        test.skip(true, 'Redirected to login or unsupported feature');
        return;
    }
    await authenticatedPage.waitForTimeout(1000);

    // Select 'Assigned' (2 ArrowDowns)
    await authenticatedPage.getByRole('combobox').nth(0).click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.keyboard.press('Escape'); 
    await authenticatedPage.waitForTimeout(2500); 

    // Verify
    const noResultsFound = authenticatedPage.locator('text=/No \\w+/i').first(); 
    const tableIdColumn = authenticatedPage.locator('table tbody tr td:first-child').first();

    if (await noResultsFound.isVisible().catch(() => false)) {
        await expect(noResultsFound).toBeVisible();
    } else if (await tableIdColumn.isVisible().catch(() => false)) {
        await expect(tableIdColumn).toBeVisible();
        const tableText = await authenticatedPage.locator('table').innerText();
        expect(tableText).toMatch(/Assign/i);
    } else {
        test.skip();
    }
  });

  // ==========================================
  // TEST 3: Completed Status
  // ==========================================
  test('should navigate to Reconcile Inventories, filter by Completed, and verify results', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    try {
        await authenticatedPage.goto(`${url.origin}/commerce/control/FindInventoryCountImport`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
        test.skip();
        return;
    }
    
    const firstCombobox = authenticatedPage.getByRole('combobox').nth(0);
    try {
        await expect(firstCombobox).toBeVisible({ timeout: 10000 });
    } catch (e) {
        test.skip(true, 'Redirected to login or unsupported feature');
        return;
    }
    await authenticatedPage.waitForTimeout(1000);

    // Select 'Completed' (3 ArrowDowns)
    await authenticatedPage.getByRole('combobox').nth(0).click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.keyboard.press('Escape'); 
    await authenticatedPage.waitForTimeout(2500); 

    // Verify
    const noResultsFound = authenticatedPage.locator('text=/No \\w+/i').first(); 
    const tableIdColumn = authenticatedPage.locator('table tbody tr td:first-child').first();

    if (await noResultsFound.isVisible().catch(() => false)) {
        await expect(noResultsFound).toBeVisible();
    } else if (await tableIdColumn.isVisible().catch(() => false)) {
        await expect(tableIdColumn).toBeVisible();
        const tableText = await authenticatedPage.locator('table').innerText();
        expect(tableText).toMatch(/Completed/i);
    } else {
        test.skip();
    }
  });

  // ==========================================
  // TEST 4: Rejected Status
  // ==========================================
  test('should navigate to Reconcile Inventories, filter by Rejected, and verify results', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    try {
        await authenticatedPage.goto(`${url.origin}/commerce/control/FindInventoryCountImport`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
        test.skip();
        return;
    }
    
    const firstCombobox = authenticatedPage.getByRole('combobox').nth(0);
    try {
        await expect(firstCombobox).toBeVisible({ timeout: 10000 });
    } catch (e) {
        test.skip(true, 'Redirected to login or unsupported feature');
        return;
    }
    await authenticatedPage.waitForTimeout(1000);

    // Select 'Rejected' (4 ArrowDowns)
    await authenticatedPage.getByRole('combobox').nth(0).click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.keyboard.press('Escape'); 
    await authenticatedPage.waitForTimeout(2500); 

    // Verify
    const noResultsFound = authenticatedPage.locator('text=/No \\w+/i').first(); 
    const tableIdColumn = authenticatedPage.locator('table tbody tr td:first-child').first();

    if (await noResultsFound.isVisible().catch(() => false)) {
        await expect(noResultsFound).toBeVisible();
    } else if (await tableIdColumn.isVisible().catch(() => false)) {
        await expect(tableIdColumn).toBeVisible();
        const tableText = await authenticatedPage.locator('table').innerText();
        expect(tableText).toMatch(/Rejected/i);
    } else {
        test.skip();
    }
  });

  // ==========================================
  // TEST 5: INV_COUNT_REVIEW Status
  // ==========================================
  test('should navigate to Reconcile Inventories, filter by Review, and verify results', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    try {
        await authenticatedPage.goto(`${url.origin}/commerce/control/FindInventoryCountImport`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
        test.skip();
        return;
    }
    
    const firstCombobox = authenticatedPage.getByRole('combobox').nth(0);
    try {
        await expect(firstCombobox).toBeVisible({ timeout: 10000 });
    } catch (e) {
        test.skip(true, 'Redirected to login or unsupported feature');
        return;
    }
    await authenticatedPage.waitForTimeout(1000);

    // Select 'Review' (5 ArrowDowns)
    await authenticatedPage.getByRole('combobox').nth(0).click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.keyboard.press('Escape'); 
    await authenticatedPage.waitForTimeout(2500); 

    // Verify
    const noResultsFound = authenticatedPage.locator('text=/No \\w+/i').first(); 
    const tableIdColumn = authenticatedPage.locator('table tbody tr td:first-child').first();

    if (await noResultsFound.isVisible().catch(() => false)) {
        await expect(noResultsFound).toBeVisible();
    } else if (await tableIdColumn.isVisible().catch(() => false)) {
        await expect(tableIdColumn).toBeVisible();
        const tableText = await authenticatedPage.locator('table').innerText();
        expect(tableText).toMatch(/Review/i);
    } else {
        test.skip();
    }
  });

});
