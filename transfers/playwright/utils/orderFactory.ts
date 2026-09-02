/**
 * orderFactory.ts
 * Provides utility functions to dynamically provision test orders via the UI.
 * Ensures idempotency and isolated state for E2E tests.
 */
import { Page, expect } from "@playwright/test";
import { CreateOrderPage } from "../pages/CreateOrderPage";
import { OrderDetailPage } from "../pages/OrderDetailPage";

/**
 * Creates a dynamic test order for use in E2E tests.
 * 
 * @param page The Playwright page object
 * @param createLabel The lifecycle option to select (e.g. "Fulfill & Receive", "Receive Only")
 * @param sku The SKU(s) to add to the order
 * @param quantity The quantity for the items (defaults to 2)
 * @returns An object containing the OrderDetailPage instance, the generated orderName, and the orderId extracted from the URL
 */
export async function createTestOrder(
  page: Page,
  createLabel: string,
  sku: string | string[],
  quantity: number = 2
) {
  const createOrderPage = new CreateOrderPage(page);
  const orderDetailPage = new OrderDetailPage(page);

  await createOrderPage.goto();
  await expect(page.getByTestId("create-order-store-select")).toBeVisible({
    timeout: 15_000,
  });

  const orderName = `Test ${createLabel.replace(/\s+/g, "")} ${Date.now()}`;
  await createOrderPage.setTransferName(orderName);
  const assignedOrigin1 = await createOrderPage.assignOrigin();
  await createOrderPage.assignDestination(undefined, assignedOrigin1);
  await createOrderPage.selectLifecycle(createLabel);

  try {
    await createOrderPage.addProduct(sku);
  } catch (e: any) {
    throw new Error(`Could not add any SKU for lifecycle "${createLabel}". Error: ${e.message}`);
  }

  await createOrderPage.setQuantity(quantity);
  await createOrderPage.clickSave();

  await orderDetailPage.verifyOrderName(orderName);
  await orderDetailPage.verifyStatus("Created");

  // Wait for the URL to reflect the order ID
  await page.waitForURL(/\/order(?:-detail)?\/([a-zA-Z0-9_-]+)/, { timeout: 10_000 }).catch(() => {});
  
  const url = page.url();
  const match = url.match(/\/order(?:-detail)?\/([a-zA-Z0-9_-]+)/);
  let orderId = "";
  if (match && match[1]) {
    orderId = match[1];
  } else {
    console.warn(`Could not extract orderId from URL: ${url}. Returning empty orderId.`);
  }

  return { orderDetailPage, orderName, orderId };
}
