/**
 * order-detail-edit.spec.ts
 * Tests mutations (Edit Qty, Remove Item) on an order in "Created" status.
 */
import { test, expect } from "@playwright/test";
import { OrderDetailPage } from "../pages/OrderDetailPage";
import { createTestOrder } from "../utils/orderFactory";
import { getClientConfig } from "../../config/clients";

let envSkus: string[] = [];

test.describe('Order Detail - Edit Created Order', () => {
  test.beforeAll(async () => {
    const clientId = process.env.CLIENT || "default";
    const config = getClientConfig(clientId);
    if (config?.shopify?.productVariants) {
      envSkus = config.shopify.productVariants.map((v: any) => v.sku).filter(Boolean);
    }
  });

  test.beforeEach(async ({ page }) => {
    // We do NOT approve the order here because we want to test "Created" state mutations
    // TODO: implement auth helper in CI
  });

  test('Can edit the ordered quantity of an item on a Created order', async ({ page }) => {
    // Need at least one SKU to test
    const targetSku = envSkus.length > 0 ? envSkus[0] : process.env.TEST_SKU || "generic-test-sku";
    
    // Create an order but do not approve it
    const { orderDetailPage, orderId } = await createTestOrder(page, "Fulfill & Receive", targetSku, 2);
    
    // Ensure the order is actually in Created status
    await orderDetailPage.verifyStatus("Created");
    
    // Verify initial quantity is 2
    await orderDetailPage.verifyItemQuantity(targetSku, 2);
    
    // Edit the quantity to 5
    await orderDetailPage.editItemQuantity(targetSku, 5);
    
    // Verify the UI updates to show 5
    await orderDetailPage.verifyItemQuantity(targetSku, 5);
  });

  test('Can remove an item from a Created order', async ({ page }) => {
    // We need 2 SKUs for this test so the order doesn't become completely empty and error out,
    // or we just test removing the only item (which might cancel the order).
    // Let's create an order with two items if possible, or just one and verify it's removed.
    const skusToTry = envSkus.length >= 2 ? [envSkus[0], envSkus[1]] : envSkus.length > 0 ? envSkus : process.env.TEST_SKU || "generic-test-sku";
    const targetSku = Array.isArray(skusToTry) ? skusToTry[0] : skusToTry;

    const { orderDetailPage } = await createTestOrder(page, "Fulfill & Receive", skusToTry, 1);
    
    await orderDetailPage.verifyStatus("Created");
    
    // Verify the item exists
    await orderDetailPage.verifyItemExists(targetSku);
    
    // Remove the item
    await orderDetailPage.removeItem(targetSku);
    
    // Check that it's either removed from the DOM or its status changes to cancelled.
    // The UI handles it by setting it to cancelled or removing it.
    // Let's check that it no longer appears as a regular item.
    // We can do this by checking if a toast appeared in `removeItem` (it does)
    // and then asserting the page is stable.
    
    // Explicitly verify the item row is visually removed or cancelled
    await orderDetailPage.verifyItemIsRemoved(targetSku);
    
    // If it's the only item, the order might cancel. 
    // Wait for the UI to stabilize.
    await page.waitForLoadState('networkidle');
  });

  test('Cannot set an ordered quantity below 0', async ({ page }) => {
    const targetSku = envSkus.length > 0 ? envSkus[0] : process.env.TEST_SKU || "generic-test-sku";
    const { orderDetailPage } = await createTestOrder(page, "Fulfill & Receive", targetSku, 2);
    
    const row = page.locator('div.list-item', { hasText: new RegExp(targetSku, 'i') }).first();
    const meatballBtn = row.locator('[data-testid^="order-item-actions-btn-"]');
    await meatballBtn.click();
    
    await orderDetailPage.popoverItemAction('edit').click();
    
    const quantityInput = page.locator('ion-alert input.alert-input').first();
    await quantityInput.fill('-5');
    
    const saveBtn = page.locator('ion-alert button', { hasText: 'Save' });
    await saveBtn.click();
    
    // Catch the error toast and assert its specific text
    const toast = page.locator("ion-toast").last();
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText(/(valid quantity|greater than)/i, { timeout: 3000 });
    
    // Wait for the toast to dismiss so we can check the page freely
    await expect(toast).toBeHidden({ timeout: 10000 });
    
    // The most important assertion: the quantity should NOT have changed on the page
    await orderDetailPage.verifyItemQuantity(targetSku, 2);
  });
});
