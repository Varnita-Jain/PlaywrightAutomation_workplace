import { test, expect } from '@playwright/test';
import { createTestOrder } from '../utils/orderFactory';
import { getClientConfig } from '../../config/clients';

let envSkus: string[] = [];

test.describe('Order Detail - Add Product Modal', () => {
  test.beforeAll(async () => {
    const clientId = process.env.CLIENT || "default";
    const config = getClientConfig(clientId);
    if (config?.shopify?.productVariants) {
      envSkus = config.shopify.productVariants.map((v: any) => v.sku).filter(Boolean);
    }
  });

  test('Add Product modal opens and displays correct UI elements', async ({ page }) => {
    // Use a generic SKU for creating order, and a keyword like "cap" for searching to ensure results
    const targetSku = envSkus.length > 0 ? envSkus[0] : process.env.TEST_SKU || "generic-test-sku";
    const searchSku = "cap";

    // 1. Create a "Created" order
    const { orderDetailPage } = await createTestOrder(page, "Fulfill & Receive", targetSku, 2);
    
    // 2. Open the Add Product modal
    await orderDetailPage.openAddProductModal();
    const modalUi = orderDetailPage.addProductModal;
    
    // 3. Verify modal title
    await expect(modalUi.title).toBeVisible();
    
    // 4. Verify Close (X) icon in top-left
    await expect(modalUi.closeBtn).toBeVisible();
    
    // 5. Verify search field with correct placeholder
    await expect(modalUi.searchbar).toBeVisible();
    
    const searchbarInput = modalUi.searchbar.locator('input');
    const placeholder = await modalUi.searchbar.getAttribute('placeholder');
    if (placeholder) {
      expect(placeholder).toMatch(/Search SKU or product name/i);
    } else {
      await expect(searchbarInput).toHaveAttribute('placeholder', /Search SKU or product name/i);
    }
    
    // 6. Verify empty-state illustration
    await expect(modalUi.emptyStateImage).toBeVisible();
    
    // 7. Verify empty state message
    await expect(modalUi.emptyStateText).toBeVisible();
    
    // 8. Verify search works (entering a valid SKU should show results)
    await modalUi.searchbar.locator('input').fill(searchSku);
    await modalUi.searchbar.locator('input').press('Enter');
    
    // Find the first ADD TO ORDER button directly
    const firstBtn = modalUi.modal.locator('ion-button', { hasText: /ADD TO ORDER/i }).first();
    await expect(firstBtn).toBeVisible({ timeout: 10000 });

    // The app currently has a bug where data-testid is literally rendering as "add-product-btn-${product.productId}" 
    // instead of interpolating the actual ID. So we must extract the SKU from the adjacent <p> tag.
    const parentItem = firstBtn.locator('xpath=ancestor::ion-item');
    const skuText = await parentItem.locator('ion-label p').textContent();
    const addedProductId = skuText ? skuText.trim() : searchSku;

    // Filter the row exactly by this unique SKU to ensure our locator is tied to this specific item
    const specificRow = modalUi.modal.locator('ion-item').filter({ hasText: addedProductId }).first();
    const specificBtn = specificRow.locator('ion-button', { hasText: /ADD TO ORDER/i });

    // 9. Click ADD TO ORDER
    await specificBtn.click();

    // The user instructed: "once this green tick is there we need to close the modal". 
    // We wait for the button in THIS SPECIFIC ROW to disappear (replaced by the green checkmark).
    await expect(specificBtn).toBeHidden({ timeout: 10000 });

    // Close the modal
    await modalUi.closeBtn.click();

    // Verify the newly added item exists on the order detail page
    await orderDetailPage.verifyItemExists(addedProductId);
  });
});
