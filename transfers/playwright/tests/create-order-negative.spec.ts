/**
 * create-order-negative.spec.ts
 * Tests form validation and error handling when attempting to create an invalid transfer order.
 */
import { test, expect } from "@playwright/test";
import { CreateOrderPage } from "../pages/CreateOrderPage";

test.describe("Create Order - Negative Scenarios", () => {
  let createOrderPage: CreateOrderPage;

  test.beforeEach(async ({ page }) => {
    createOrderPage = new CreateOrderPage(page);
    await createOrderPage.goto();

    // Check if the page loaded correctly or if we hit an auth wall/unseeded environment
    const storeSelect = page.getByTestId("create-order-store-select");
    if ((await storeSelect.count()) === 0) {
      test.skip(
        true,
        "Skipping test because Create Order UI failed to load (auth or data issue)"
      );
    }
    await expect(storeSelect).toBeVisible({ timeout: 15000 });
  });

  test("Cannot submit order without items", async ({ page }) => {
    // Scenario: User navigates to create order, fills out standard header details,
    // but forgets to add any actual products. The system should prevent creation
    // and warn them to add at least one item.
    await createOrderPage.setTransferName("Test Empty Order");
    await createOrderPage.saveBtn.click();

    const toast = page.locator("ion-toast").last();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Please add atleast one item");
  });

  test("Cannot submit order with missing transfer name", async ({ page }) => {
    // Scenario: User adds a product and configures routing, but forgets to provide a
    // transfer order name. Order names are required for clear identification.
    await createOrderPage.addProduct(process.env.TEST_SKU || "generic-test-sku");
    await createOrderPage.setQuantity(5);

    // Clear just in case
    await createOrderPage.transferNameInput.fill("");
    await createOrderPage.saveBtn.click();

    const toast = page.locator("ion-toast").last();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("valid transfer order name");
  });

  test("Cannot submit order with exact same origin and destination facility", async ({
    page,
  }) => {
    // Scenario: User mistakenly assigns the same facility to both origin and destination.
    // The system should logically reject self-transfers to prevent data anomalies.
    await createOrderPage.setTransferName("Test Same Facility");
    await createOrderPage.addProduct(process.env.TEST_SKU || "generic-test-sku");
    await createOrderPage.setQuantity(5);

    // Assigning identical locations
    const selectedFacility = await createOrderPage.assignOrigin();
    await createOrderPage.assignDestination(selectedFacility);

    await createOrderPage.saveBtn.click();

    const toast = page.locator("ion-toast").last();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(
      "Origin and destination facility can't be same."
    );
  });

  test("Cannot submit order with 0 item quantity", async ({ page }) => {
    // Scenario: User adds a product to the list but intentionally or accidentally
    // sets its ordered quantity to 0. Operations only apply to non-zero totals.
    await createOrderPage.setTransferName("Test Zero Qty");
    const assignedOrigin1 = await createOrderPage.assignOrigin();
    await createOrderPage.assignDestination(undefined, assignedOrigin1);

    await createOrderPage.addProduct(process.env.TEST_SKU || "generic-test-sku");
    await createOrderPage.setQuantity(0);

    await createOrderPage.saveBtn.click();

    const toast = page.locator("ion-toast").last();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("valid ordered quantity");
  });

  test("Cannot add a non-existent product", async ({ page }) => {
    // Scenario: User inputs an invalid or non-existent SKU string.
    // The system should display a clear "No product found" message and
    // prevent the addition of bad items.
    await createOrderPage.productSearchInput
      .locator("input")
      .fill("INVALID_SKU_UNKNOWN_9999");
    await page.keyboard.press("Enter");

    const noProductText = page.getByText("No product found");
    await expect(noProductText).toBeVisible({ timeout: 10000 });
    await expect(createOrderPage.addProductBtn).toBeHidden();
  });

  test("Cannot submit order with missing assignment properties", async ({
    page,
  }) => {
    // Scenario: User fills in transfer name and item details but manually forgets
    // to assign origin/destination. System blocks submission to ensure routing integrity
    await createOrderPage.setTransferName("Test Missing Routing");
    await createOrderPage.addProduct(process.env.TEST_SKU || "generic-test-sku");
    await createOrderPage.setQuantity(5);

    // Skipping assignment for origin.

    await createOrderPage.saveBtn.click();

    const toast = page.locator("ion-toast").last();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("select all the required properties");
  });
});
