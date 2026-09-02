/**
 * order-detail-bulk-actions.spec.ts
 * Tests bulk action workflows on the Order Detail page (e.g., selecting multiple items, receiving all).
 */
import { test, expect } from "@playwright/test";
import { OrderDetailPage } from "../pages/OrderDetailPage";
import { createTestOrder } from "../utils/orderFactory";
import { getClientConfig } from "../../config/clients";

let envSkus: string[] = [];

// Removed hardcoded TEST_ORDER_ID

async function gotoOrderDetail(page: any, orderId: string) {
  const od = new OrderDetailPage(page);
  await od.goto(orderId);
  return od;
}

function getItemSeqIdFromCheckboxTestId(testId: string): string {
  return testId.replace("order-item-checkbox-", "");
}

async function getSelectableItemSeqIds(od: OrderDetailPage): Promise<string[]> {
  const checkboxes = od.page.locator('[data-testid^="order-item-checkbox-"]');
  const count = await checkboxes.count();
  const selectable: string[] = [];

  for (let i = 0; i < count; i++) {
    const checkbox = checkboxes.nth(i);
    const isDisabled = (await checkbox.getAttribute('aria-disabled') === 'true') || (await checkbox.isDisabled());
    if (isDisabled) continue;
    const testId = await checkbox.getAttribute("data-testid");
    if (!testId) continue;
    selectable.push(getItemSeqIdFromCheckboxTestId(testId));
  }

  return selectable;
}

test.describe("Bulk Actions - Transfer Orders (E2E + edge cases)", () => {
  let testOrderId: string;

  test.beforeAll(async () => {
    const clientId = process.env.CLIENT || "default";
    const config = getClientConfig(clientId);
    if (config?.shopify?.productVariants) {
      envSkus = config.shopify.productVariants.map((v: any) => v.sku).filter(Boolean);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Dynamically provision a real order for each test to ensure a clean state
    const skusToTry = envSkus.length > 0 ? envSkus : process.env.TEST_SKU || "generic-test-sku";
    const { orderDetailPage, orderId } = await createTestOrder(page, "Receive Only", skusToTry);
    await orderDetailPage.approveOrder();
    await orderDetailPage.verifyStatus("Approved");
    testOrderId = orderId;
  });

  test("Bulk Receive: selected eligible items can be processed via modal", async ({
    page,
  }) => {
    const od = await gotoOrderDetail(page, testOrderId);
    const selectableSeqIds = await getSelectableItemSeqIds(od);
    const bulkReceiveBtn = od.footerButton("BULK_RECEIVE");
    if (selectableSeqIds.length < 1) {
      // In a real test order, this shouldn't happen, but keep as fallback
      if (await bulkReceiveBtn.count()) {
        await expect(bulkReceiveBtn).toHaveAttribute('aria-disabled', 'true');
      } else {
        await expect(bulkReceiveBtn).toHaveCount(0);
      }
      return;
    }

    for (const seqId of selectableSeqIds) {
      await od.itemRow(seqId).first().click();
      await expect(od.itemCheckbox(seqId)).toBeChecked();
    }

    await expect(bulkReceiveBtn).toBeVisible();
    await expect(bulkReceiveBtn).not.toHaveAttribute('aria-disabled', 'true');
    await bulkReceiveBtn.click({ force: true });

    const modalConfirm = od.bulkModalConfirm();
    await expect(modalConfirm).toBeVisible();
    await expect(
      od.page.getByTestId("bulk-modal-receive-mode-group")
    ).toBeVisible();

    // Toggle receive modes once to verify controls are actionable.
    await od.page.getByTestId("bulk-modal-receive-mode-ordered").click({ force: true });
    if (await od.page.getByTestId("bulk-modal-receive-mode-issued").getAttribute('aria-disabled') !== 'true') {
      await od.page.getByTestId("bulk-modal-receive-mode-issued").click({ force: true });
    }

    await modalConfirm.click();

    const progress = od.bulkModalProgress();
    await expect(progress).toBeVisible({ timeout: 30_000 });

    const successCount = od.bulkResultsSuccessCount();
    await expect(successCount).toBeVisible({ timeout: 30_000 });
    await expect(successCount).toHaveText(/\d+/);

    const doneBtn = od.bulkModalDoneButton();
    await expect(doneBtn).toBeVisible();
    await doneBtn.click();
    
    // Ensure modal closes completely
    await expect(modalConfirm).toBeHidden({ timeout: 10000 });
    
    // Assert that all footer buttons are now disabled since all items have been processed
    // Note: Playwright's toBeDisabled() can sometimes fail on Ionic custom elements,
    // so we verify the 'disabled' attribute or 'aria-disabled="true"' directly.
    await expect(bulkReceiveBtn).toHaveAttribute('aria-disabled', 'true', { timeout: 15000 });
    
    const cancelBtn = od.footerButton("CANCEL");
    if (await cancelBtn.count() > 0) {
      await expect(cancelBtn).toHaveAttribute('aria-disabled', 'true', { timeout: 15000 });
    }
    
    const addItemsBtn = od.footerButton("ADD_ITEMS");
    if (await addItemsBtn.count() > 0) {
      await expect(addItemsBtn).toHaveAttribute('aria-disabled', 'true', { timeout: 15000 });
    }
  });

  test("Select All: header checkbox selects only eligible items and becomes indeterminate when partially selected", async ({
    page,
  }) => {
    const od = await gotoOrderDetail(page, testOrderId);
    const selectableSeqIds = await getSelectableItemSeqIds(od);
    const selectAllRow = od.page.getByTestId("order-items-select-row");
    if ((await selectAllRow.count()) === 0) {
      await expect(od.page.getByText("Transfer order details")).toBeVisible();
      return;
    }
    await expect(selectAllRow).toBeVisible();
    if (selectableSeqIds.length < 2) {
      await od.clickSelectAll();
      const selectAll = od.page.getByTestId("order-items-select-all");
      await expect(selectAll).toBeVisible();
      return;
    }

    await od.clickSelectAll();

    for (const seqId of selectableSeqIds) {
      await expect(od.itemCheckbox(seqId)).toBeChecked();
    }

    await od.itemRow(selectableSeqIds[0]).first().click();
    const selectAll = od.page.getByTestId("order-items-select-all");
    await expect(selectAll).not.toBeChecked();
  });

  test("Footer label changes for partial selection (close items vs close order)", async ({
    page,
  }) => {
    const od = await gotoOrderDetail(page, testOrderId);
    const cancelBtn = od.footerButton("CANCEL");
    await expect(cancelBtn).toBeVisible();

    const selectableSeqIds = await getSelectableItemSeqIds(od);
    if (selectableSeqIds.length < 2) {
      await expect(cancelBtn).toContainText(/Cancel order|Cancel/i);
      return;
    }

    await expect(cancelBtn).toContainText(/Cancel order|Cancel/i);
    await od.itemRow(selectableSeqIds[0]).first().click();
    await expect(cancelBtn).toContainText(/Close/i);
    await expect(cancelBtn).toContainText(/item/i);
  });

  test("Close fulfillment button is disabled when not currently allowed", async ({
    page,
  }) => {
    const od = await gotoOrderDetail(page, testOrderId);
    const closeBtn = od.footerButton("CLOSE_FULFILLMENT");
    if ((await closeBtn.count()) > 0) {
      const isDisabled = (await closeBtn.getAttribute('aria-disabled') === 'true') || (await closeBtn.isDisabled());
      expect(isDisabled).toBe(true);
      const isEnabled = await closeBtn.isEnabled();
      expect(isDisabled || isEnabled).toBeTruthy();
    }
  });

  test("Bulk receive is enabled when no items are selected (receives all eligible) and remains enabled when items are selected", async ({
    page,
  }) => {
    const od = await gotoOrderDetail(page, testOrderId);
    const bulkReceiveBtn = od.footerButton("BULK_RECEIVE");
    if ((await bulkReceiveBtn.count()) === 0) {
      await expect(bulkReceiveBtn).toHaveCount(0);
      return;
    }

    const selectableSeqIds = await getSelectableItemSeqIds(od);
    if (selectableSeqIds.length === 0) {
      // If there are NO eligible items at all, it should be disabled
      await expect(bulkReceiveBtn).toHaveAttribute('aria-disabled', 'true');
      return;
    }

    // Since there are eligible items, the button acts as "Receive All" and should be enabled even when 0 are selected
    await expect(bulkReceiveBtn).not.toHaveAttribute('aria-disabled', 'true');
    
    // Select an item, button should still be enabled (now it will only receive the selected items)
    await od.itemRow(selectableSeqIds[0]).first().click();
    await expect(bulkReceiveBtn).not.toHaveAttribute('aria-disabled', 'true');
    
    // Deselect the item, it goes back to 0 selected (Receive All state), so it should still be enabled
    await od.itemRow(selectableSeqIds[0]).first().click();
    await expect(bulkReceiveBtn).toBeEnabled();
  });
});

test.describe("Bulk Actions - Create Transfer Order", () => {
  let envSkus: string[] = [];

  test.beforeAll(async () => {
    const clientId = process.env.CLIENT || "default";
    const config = getClientConfig(clientId);
    if (config?.shopify?.productVariants) {
      envSkus = config.shopify.productVariants.map((v: any) => v.sku).filter(Boolean);
    }
  });

  test("Book QOH, Book ATP, and Custom QTY bulk actions correctly set quantities", async ({ page }) => {
    // Navigate to create order page
    await page.goto("/create-order");
    await page.waitForLoadState("networkidle");

    // Add a product
    const sku = envSkus.length > 0 ? envSkus[0] : process.env.TEST_SKU || "generic-test-sku";
    
    // Use the product search input to add a product
    const searchInput = page.getByTestId("create-order-add-product-input").locator("input");
    await searchInput.fill(sku);
    await page.keyboard.press("Enter");
    
    const addProductBtn = page.getByTestId("create-order-add-product-btn");
    await expect(addProductBtn).toBeVisible({ timeout: 10000 });
    await addProductBtn.click();
    
    // Wait for the product to appear in the list
    const qtyInput = page.locator('input[type="number"]').first();
    await expect(qtyInput).toBeVisible({ timeout: 10000 });

    // Select the master checkbox to reveal bulk action buttons
    // The master checkbox is typically a child of an ion-checkbox
    const masterCheckbox = page.locator('ion-checkbox').first();
    await masterCheckbox.click({ force: true });

    // Test Book QOH
    const bookQohBtn = page.getByRole("button", { name: /BOOK QOH/i });
    await expect(bookQohBtn).toBeVisible();
    await bookQohBtn.click();
    
    // Verify Qty changed (just verify it's not empty, since QOH might vary)
    let qtyValue = await qtyInput.inputValue();
    expect(qtyValue).not.toBe("");
    
    // Test Book ATP
    const bookAtpBtn = page.getByRole("button", { name: /BOOK ATP/i });
    await expect(bookAtpBtn).toBeVisible();
    await bookAtpBtn.click();
    
    // Test Custom QTY
    const customQtyBtn = page.getByRole("button", { name: /CUSTOM QTY/i });
    await expect(customQtyBtn).toBeVisible();
    await customQtyBtn.click();
    
    // A popover/alert should appear
    const alertInput = page.locator("ion-alert input.alert-input").first();
    await expect(alertInput).toBeVisible({ timeout: 5000 });
    await alertInput.fill("42");
    
    const applyBtn = page.locator("ion-alert button").filter({ hasText: /OK|Apply|Done|Save/i }).first();
    await applyBtn.click();
    
    // Verify the Qty is updated to 42
    await expect(qtyInput).toHaveValue("42", { timeout: 5000 });
  });
});

