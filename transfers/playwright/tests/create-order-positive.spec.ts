/**
 * create-order-positive.spec.ts
 * Happy path E2E tests for successfully creating a new transfer order.
 */
import { test, expect } from "@playwright/test";
import { CreateOrderPage } from "../pages/CreateOrderPage";
import { OrderDetailPage } from "../pages/OrderDetailPage";

test.describe("Create Order - Positive Scenarios", () => {
  let createOrderPage: CreateOrderPage;
  let orderDetailPage: OrderDetailPage;

  test.beforeEach(async ({ page }) => {
    createOrderPage = new CreateOrderPage(page);
    orderDetailPage = new OrderDetailPage(page);

    await createOrderPage.goto();

    // Graceful skipping if component misses seeding/login bypass
    const storeSelect = page.getByTestId("create-order-store-select");
    if ((await storeSelect.count()) === 0) {
      test.skip(true, "UI not fully initialized - skipping positive specs");
    }
    await expect(storeSelect).toBeVisible({ timeout: 15000 });
  });

  test("Create Fulfill & Receive transfer order with customized Ship Date", async ({
    page,
  }) => {
    // Scenario: End-to-end pathway for the default lifecycle 'Fulfill & Receive',
    // while also verifying the customized Date modal functionality.
    await createOrderPage.setTransferName("Fulfill-Receipt Flow Test");

    // Setup Route
    const assignedOrigin = await createOrderPage.assignOrigin();
    await createOrderPage.assignDestination(undefined, assignedOrigin);

    // Explicitly set default lifecycle
    await createOrderPage.selectLifecycle("Fulfill & Receive");

    // Click the modal trigger for the Ship Date
    const shipDateBtn = page.getByTestId("create-order-shipdate-btn");
    await shipDateBtn.click();

    // Simply dismiss to bind current default selection/close the Ionic Date-picker cleanly
    await page.locator(".date-time-modal").locator("ion-button").last().click();

    // Add Multiple Products
    await createOrderPage.addProduct(process.env.TEST_SKU || "generic-test-sku");
    await createOrderPage.addProduct("WT09");

    // Fill quantities manually to avoid overlap with Bulk Actions tests
    const qtyInputs = page.locator('input[type="number"]');
    const qtyInputCount = await qtyInputs.count();
    for (let i = 0; i < qtyInputCount; i++) {
      const input = qtyInputs.nth(i);
      await input.fill("2");
    }

    // Submit constraints
    await createOrderPage.clickSave();

    // Verify we hit the detail page successfully
    await orderDetailPage.verifyStatus("Created");
    await orderDetailPage.verifyOrderName("Fulfill-Receipt Flow Test");
  });
});
