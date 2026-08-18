const { test, expect } = require('../../fixtures/fixtures');

test.describe('PIM / Products Flow', () => {

  test('should navigate to Products via menu and open the first product', async ({ authenticatedPage, baseURL, clientId, messageValidator }) => {
    console.log(`\n=== Running Products Test for: ${clientId} ===`);

    const url = new URL(baseURL);

    // 1. Navigate to the main dashboard to access the side menu
    await authenticatedPage.goto(`${url.origin}/commerce/control/main`);
    await authenticatedPage.waitForLoadState('networkidle');

    // 2. Open/reveal side menu
    console.log('Step 1: Revealing side menu...');
    await authenticatedPage.evaluate(() => {
      const sidebar = document.querySelector('.side-menu');
      if (sidebar) {
        sidebar.classList.remove('hidden-xs');
        sidebar.style.display = 'block';
      }
    });

    const sideMenu = authenticatedPage.locator('.side-menu').first();
    await sideMenu.hover();
    await authenticatedPage.waitForTimeout(1000); // Give UI time to expand

    // 3. Find and click 'PIM'
    console.log('Step 2: Clicking "PIM" from the side menu...');
    await sideMenu.getByText('PIM', { exact: true }).click();
    await authenticatedPage.waitForTimeout(1000); // Wait for submenu to slide down

    // 4. Find and click 'Products'
    console.log('Step 3: Clicking "Products" from the submenu...');
    // We locate the exact menu link by its destination URL to be 100% safe
    // Executing the click natively via JavaScript to bypass responsive UI layout issues in headed mode
    await authenticatedPage.evaluate(() => {
      const link = document.querySelector('a[href*="/commerce/control/FindProduct"]');
      if (link) link.click();
    });

    // 5. Wait for page load
    console.log('Step 4: Verifying the "Products" page loaded...');
    await authenticatedPage.waitForLoadState('networkidle');
    // Instead of looking for a strict 'heading' role, we just wait for a visible element containing "Products"
    await expect(authenticatedPage.locator('text="Products"').first()).toBeVisible({ timeout: 10000 });

    // 6. Find the first product link in the table
    console.log('Step 5: Locating the first product in the table...');
    // We locate the first anchor tag that has 'ViewProduct?productId=' in its href
    const firstProductLink = authenticatedPage.locator('a[href*="ViewProduct?productId="]').first();
    
    // Ensure the table actually populated with data
    await expect(firstProductLink).toBeVisible({ timeout: 15000 });

    // Extract the productId from the href so we know exactly what we are clicking!
    const href = await firstProductLink.getAttribute('href');
    const urlObj = new URL(href, url.origin);
    const expectedProductId = urlObj.searchParams.get('productId');
    console.log(`Found product in table! Product ID is: ${expectedProductId}`);

    // 7. Click the product link
    console.log('Step 6: Clicking the product link to open the details page...');
    await firstProductLink.click();

    // 8. Verify the new page URL contains the selected productId
    console.log(`Step 7: Verifying the new URL contains productId=${expectedProductId}...`);
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Assert that the URL contains the exact product ID we clicked on
    await expect(authenticatedPage).toHaveURL(new RegExp(`productId=${expectedProductId}`));

    console.log('Step 8: Validating UI components on Product Details page...');

    // 1. Header & Action Buttons Validation
    console.log('  -> Checking Action Buttons...');
    await expect(authenticatedPage.locator('text="View Inventory"').first()).toBeVisible();
    await expect(authenticatedPage.locator('text="Reindex"').first()).toBeVisible();

    // 2. Overview Section Validation
    console.log('  -> Checking Overview Section labels...');
    await expect(authenticatedPage.locator('text="Overview"').first()).toBeVisible();
    await expect(authenticatedPage.locator('text="Product Type"').first()).toBeVisible();
    await expect(authenticatedPage.locator('text="Product Name"').first()).toBeVisible();
    await expect(authenticatedPage.locator('text="SKU"').first()).toBeVisible();
    await expect(authenticatedPage.locator('text="Parent"').first()).toBeVisible();
    
    // Photo validation (might be a placeholder or an actual image)
    const photoNotAvail = authenticatedPage.locator('text="PHOTO NOT AVAILABLE"').first();
    const productImage = authenticatedPage.locator('img').first();
    await expect(photoNotAvail.or(productImage)).toBeVisible();

    // 3. Checkboxes Validation
    console.log('  -> Checking Checkboxes...');
    await expect(authenticatedPage.locator('text="Shippable"').first()).toBeVisible();
    await expect(authenticatedPage.locator('text="In Ship Box"').first()).toBeVisible();

    // 4. Dimensions Table Validation
    console.log('  -> Checking Dimensions Table...');
    await expect(authenticatedPage.locator('table th:has-text("Height")').first()).toBeVisible();
    await expect(authenticatedPage.locator('table th:has-text("Width")').first()).toBeVisible();
    await expect(authenticatedPage.locator('table th:has-text("Depth")').first()).toBeVisible();
    await expect(authenticatedPage.locator('table th:has-text("Weight")').first()).toBeVisible();
    await expect(authenticatedPage.locator('table td:has-text("Product")').first()).toBeVisible();
    await expect(authenticatedPage.locator('table td:has-text("Shipping")').first()).toBeVisible();

    // 5. Additional Sections Validation
    console.log('  -> Checking Additional Sections...');
    await expect(authenticatedPage.locator('text="Features"').first()).toBeVisible();
    await expect(authenticatedPage.locator('text="Identifications"').first()).toBeVisible();
    await expect(authenticatedPage.locator('text="Shopify Shop Product"').first()).toBeVisible();

    console.log(`\n[SUCCESS] Successfully navigated to, opened, and validated product ${expectedProductId}!`);

    // --- NEW PRODUCT INFO MUTATIONS & VALIDATIONS ---
    console.log('\nStep 8.5: Testing Product Information Edits (PD-018 to PD-025)...');
    
    // PD-023: Verify Parent Product link displayed
    const parentLabel = authenticatedPage.locator('dt:has-text("Parent")').first();
    const parentLink = parentLabel.locator('+ dd a').first();
    
    // Check if parent product exists for this item
    if (await parentLink.count() > 0) {
      const parentName = await parentLink.textContent();
      console.log(`  -> PD-023: Parent Product link found (${parentName.trim()})`);
      
      // PD-024: Click Parent Product link
      const [parentPage] = await Promise.all([
        authenticatedPage.context().waitForEvent('page'),
        parentLink.evaluate(node => node.click())
      ]);
      await parentPage.waitForLoadState('networkidle');
      console.log('  -> PD-024: Parent Product page opened in new tab.');
      
      // PD-025: Verify parent-child relationship (Check if the new page shows the parent product)
      const expectedParentId = new URL(await parentLink.getAttribute('href'), url.origin).searchParams.get('productId');
      await expect(parentPage).toHaveURL(new RegExp(expectedParentId));
      console.log('  -> PD-025: Successfully verified Parent Product page context.');
      await parentPage.close();
    } else {
      console.log('  -> PD-023: (Skipped) No Parent Product linked to this item.');
    }

    // PD-020, PD-021, PD-022: Edit Product Name and Rollback
    console.log('  -> Testing Product Name edits...');
    const editProductBtn = authenticatedPage.locator('a[title="Edit Product"]').first();
    await editProductBtn.click();
    
    const productNameInput = authenticatedPage.locator('.modal-dialog input[name="productName"]');
    await expect(productNameInput).toBeVisible({ timeout: 10000 });
    
    // Save original value for rollback
    const originalProductName = await productNameInput.inputValue();
    console.log(`  -> Original Product Name is: "${originalProductName}"`);
    
    // PD-022: Save blank Product Name
    await productNameInput.fill('');
    await authenticatedPage.locator('.modal-dialog button:has-text("Save")').click();
    
    // Hotwax uses HTML5 form validation or a modal error, so the modal should stay open
    await expect(productNameInput).toBeVisible();
    console.log('  -> PD-022: Blank product name rejected (validation displayed).');
    
    // Close modal to clear validation state
    await authenticatedPage.locator('.modal-dialog button.close').click();
    await expect(authenticatedPage.locator('.modal-dialog')).toBeHidden();
    
    // Re-open for PD-021
    await editProductBtn.click();
    await expect(productNameInput).toBeVisible({ timeout: 10000 });

    // PD-021: Update Product Name
    const testProductName = originalProductName + ' - AUTOMATION TEST';
    await productNameInput.fill(testProductName);
    await authenticatedPage.locator('.modal-dialog button:has-text("Save")').click();
    
    // Wait for modal to close and UI to update
    await expect(authenticatedPage.locator('.modal-dialog')).toBeHidden({ timeout: 10000 });
    await expect(authenticatedPage.locator(`text="${testProductName}"`).first()).toBeVisible({ timeout: 10000 });
    console.log('  -> PD-021: Product Name updated successfully.');
    
    // Rollback Product Name
    console.log('  -> Rolling back Product Name...');
    await editProductBtn.click();
    await expect(productNameInput).toBeVisible({ timeout: 10000 });
    await productNameInput.fill(originalProductName);
    await authenticatedPage.locator('.modal-dialog button:has-text("Save")').click();
    await expect(authenticatedPage.locator('.modal-dialog')).toBeHidden({ timeout: 10000 });
    await expect(authenticatedPage.locator(`text="${originalProductName}"`).first()).toBeVisible({ timeout: 10000 });
    console.log('  -> Rollback complete.');

    // --- SKU MUTATION (PD-026, PD-027, PD-028) ---
    console.log('  -> Testing SKU edits...');
    const editSkuBtn = authenticatedPage.locator('a[data-dialog-href*="goodIdentificationTypeId=SKU"]').first();
    
    if (await editSkuBtn.count() > 0) {
      await editSkuBtn.click();
      const skuInput = authenticatedPage.locator('.modal-dialog input[name="idValue"]');
      await expect(skuInput).toBeVisible({ timeout: 10000 });
      
      const originalSku = await skuInput.inputValue();
      console.log(`  -> Original SKU is: "${originalSku}"`);
      
      // PD-028: Edit SKU
      const testSku = originalSku + '-TEST';
      await skuInput.fill(testSku);
      await authenticatedPage.locator('.modal-dialog button:has-text("Save")').click();
      await expect(authenticatedPage.locator('.modal-dialog')).toBeHidden({ timeout: 10000 });
      await expect(authenticatedPage.locator(`text="${testSku}"`).first()).toBeVisible({ timeout: 10000 });
      console.log('  -> SKU updated successfully.');
      
      // Rollback SKU
      console.log('  -> Rolling back SKU...');
      await editSkuBtn.click();
      await expect(skuInput).toBeVisible({ timeout: 10000 });
      await skuInput.fill(originalSku);
      await authenticatedPage.locator('.modal-dialog button:has-text("Save")').click();
      await expect(authenticatedPage.locator('.modal-dialog')).toBeHidden({ timeout: 10000 });
      console.log('  -> SKU rollback complete.');
    } else {
      console.log('  -> (Skipped) Edit SKU button not found.');
    }

    // --- BRAND MUTATION (PD-029, PD-031) ---
    console.log('  -> Testing Brand edits...');
    await editProductBtn.click();
    const brandInput = authenticatedPage.locator('.modal-dialog input[name="brandName"]');
    await expect(brandInput).toBeVisible({ timeout: 10000 });
    
    const originalBrand = await brandInput.inputValue();
    console.log(`  -> Original Brand is: "${originalBrand}"`);
    
    // PD-029: Add / Update Brand
    const testBrand = originalBrand ? originalBrand + '-TEST' : 'TEST-BRAND';
    await brandInput.fill(testBrand);
    await authenticatedPage.locator('.modal-dialog button:has-text("Save")').click();
    await expect(authenticatedPage.locator('.modal-dialog')).toBeHidden({ timeout: 10000 });
    console.log('  -> Brand updated successfully.');
    
    // PD-031: Remove Brand (Set to blank)
    await editProductBtn.click();
    await expect(brandInput).toBeVisible({ timeout: 10000 });
    await brandInput.fill('');
    await authenticatedPage.locator('.modal-dialog button:has-text("Save")').click();
    await expect(authenticatedPage.locator('.modal-dialog')).toBeHidden({ timeout: 10000 });
    console.log('  -> Brand removed successfully.');
    
    // Rollback Brand
    console.log('  -> Rolling back Brand...');
    await editProductBtn.click();
    await expect(brandInput).toBeVisible({ timeout: 10000 });
    await brandInput.fill(originalBrand);
    await authenticatedPage.locator('.modal-dialog button:has-text("Save")').click();
    await expect(authenticatedPage.locator('.modal-dialog')).toBeHidden({ timeout: 10000 });
    await expect(authenticatedPage.locator('.modal-backdrop')).toBeHidden({ timeout: 10000 });
    console.log('  -> Brand rollback complete.');

    // --- QTY UOM MUTATION (PD-032) ---
    console.log('  -> Testing Qty Uom edits...');
    const addUomBtn = authenticatedPage.locator('a[title="Qty Uom"]').first();
    if (await addUomBtn.count() > 0) {
      await addUomBtn.click();
      const uomSelect = authenticatedPage.locator('.modal-dialog select[name="quantityUomId"]');
      await expect(uomSelect).toBeVisible({ timeout: 10000 });
      
      // Select an option and Add
      await uomSelect.selectOption('QTY_BOX');
      await authenticatedPage.locator('.modal-dialog button:has-text("Add")').click();
      await expect(authenticatedPage.locator('.modal-dialog')).toBeHidden({ timeout: 10000 });
      // Wait for modal backdrop to completely fade out
      await expect(authenticatedPage.locator('.modal-backdrop')).toBeHidden({ timeout: 10000 });
      console.log('  -> Qty UOM Add dialog submitted.');
    } else {
      console.log('  -> (Skipped) Qty Uom button not found.');
    }

    // --- NEW REINDEX TEST CASES ---
    console.log('\nStep 9: Testing Reindex flow (PD-014, PD-015)...');
    await authenticatedPage.reload();
    await expect(authenticatedPage.locator('text="Reindex"').first()).toBeVisible({ timeout: 10000 });
    
    // First, intercept the dialog because Reindex might trigger a native alert/confirm
    let dialogHandled = false;
    authenticatedPage.once('dialog', async dialog => {
      dialogHandled = true;
      await dialog.accept();
    });
    
    // Click Reindex Button
    const reindexBtn = authenticatedPage.locator('text="Reindex"').first();
    await reindexBtn.click();
    console.log('  -> Clicked Reindex button.');

    // PD-015: Verify success message after reindex
    // Wait for the strict success toast to appear, enforcing UX rules
    await authenticatedPage.waitForLoadState('domcontentloaded');
    await messageValidator.verifySuccessToast();
    console.log('  -> Success notification displayed and validated!');
    await authenticatedPage.waitForLoadState('networkidle');

    // --- NEW INVENTORY TEST CASES ---
    console.log('\nStep 10: Testing View Inventory flow...');

    // PD-010, INV-001: Click View Inventory and wait for new tab
    const [inventoryPage] = await Promise.all([
      authenticatedPage.context().waitForEvent('page'),
      authenticatedPage.locator('text="View Inventory"').first().click()
    ]);
    
    await inventoryPage.waitForLoadState('networkidle');
    console.log('  -> Inventory page opened in new tab.');

    // PD-011, INV-002: Verify Product ID in URL and correct inventory displayed
    await expect(inventoryPage).toHaveURL(new RegExp(expectedProductId));
    await expect(inventoryPage.locator(`text="${expectedProductId}"`).first()).toBeVisible();
    console.log('  -> Correct Product ID found in URL and page content.');

    // INV-003: Verify breadcrumb navigation
    await expect(inventoryPage.locator('text="Products"').first()).toBeVisible();
    await expect(inventoryPage.locator('text="Inventory"').first()).toBeVisible();
    console.log('  -> Breadcrumb contains Products and Inventory.');

    // INV-005: Click Inventory breadcrumb (User remains on Inventory page)
    await inventoryPage.locator('a:has-text("Inventory")').first().click({ force: true });
    await inventoryPage.waitForLoadState('networkidle');
    await expect(inventoryPage).toHaveURL(new RegExp(expectedProductId));
    console.log('  -> Clicked Inventory breadcrumb, remained on Inventory page.');

    // INV-004: Click Products breadcrumb (User navigates to Product List page)
    await inventoryPage.locator('a:has-text("Products")').first().evaluate(node => node.click());
    await inventoryPage.waitForLoadState('networkidle');
    
    // Assume it goes back to FindProduct or the main PIM dashboard
    await expect(inventoryPage).toHaveURL(/(FindProduct|main|PIM)/i);
    console.log('  -> Clicked Products breadcrumb, navigated back to Product List.');

    console.log(`\n[SUCCESS] Successfully validated Inventory flows for product ${expectedProductId}!`);
  });

});
