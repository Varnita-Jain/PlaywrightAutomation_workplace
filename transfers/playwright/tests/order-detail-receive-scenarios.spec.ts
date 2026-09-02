/**
 * order-detail-receive-scenarios.spec.ts
 * Tests complex discrepancy scenarios (over-receiving, under-receiving, rejecting) 
 * within the Receive modal on the Order Detail page.
 */
import { test, expect, Page } from "@playwright/test";
import { OrderDetailPage } from "../pages/OrderDetailPage";
import { createTestOrder } from "../utils/orderFactory";

let testOrderId: string;
let testSku = process.env.TEST_SKU || "cap";

test.describe("Bulk Receive Modal - Discrepancy Scenarios", () => {
  // Use a BEFORE_EACH to create a single order that we will navigate to
  // and intercept the API for in each test
  test.beforeEach(async ({ page }) => {
    // We create a single standard order for all these scenarios,
    // The exact shipped/received quantities will be mocked via page.route in each test
    // We use "Receive Only" lifecycle to ensure the Bulk Receive button is valid.
    const { orderDetailPage, orderId } = await createTestOrder(page, "Receive Only", testSku, 5);
    await orderDetailPage.approveOrder();
    testOrderId = orderId;
  });

  // Helper function to dynamically mock the API responses for the order
  async function mockOrderQuantities(page: Page, ordered: number, shipped: number, received: number, itemStatusId?: string, orderStatusId?: string) {
    await page.route('**/*', async (route) => {
      const req = route.request();
      if (req.method() === 'GET' && (req.url().includes('oms/') || req.url().includes('poorti/') || req.url().includes('performFind'))) {
        const response = await route.fetch();
        const body = await response.text();
        if (body) {
          try {
            const json = JSON.parse(body);
            let modified = false;
            
            if (json.docs && json.docs.length > 0) {
              if (json.docs[0].statusId && orderStatusId) {
                json.docs[0].statusId = orderStatusId;
                modified = true;
              }
            }

            // Deep walk the JSON to find item arrays and modify their quantities
            const walk = (obj: any) => {
              if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                  if (obj[i] && typeof obj[i] === 'object' && ('quantity' in obj[i] || 'shippedQty' in obj[i] || 'itemStatusId' in obj[i])) {
                    if (!obj[i].facilityIdTo) {
                      obj[i].quantity = ordered;
                      obj[i].orderedQuantity = ordered;
                      obj[i].shippedQty = shipped;
                      obj[i].totalIssuedQuantity = shipped; // Some APIs use this
                      obj[i].receivedQty = received;
                      obj[i].receivedQuantity = received;
                      obj[i].totalReceivedQuantity = received;
                      if (itemStatusId) {
                        obj[i].itemStatusId = itemStatusId;
                        obj[i].statusId = itemStatusId;
                      }
                      modified = true;
                    }
                  } else {
                    walk(obj[i]);
                  }
                }
              } else if (obj && typeof obj === 'object') {
                for (const key of Object.keys(obj)) {
                  walk(obj[key]);
                }
              }
            };
            
            walk(json);
            
            if (modified) {
              await route.fulfill({ response, json });
              return;
            }
          } catch (e) {}
        }
        await route.fulfill({ response });
      } else {
        await route.continue();
      }
    });
  }

  test("Scenario 1 — Ordered = Shipped (0 discrepancy)", async ({ page }) => {
    await mockOrderQuantities(page, 5, 5, 0);
    const od = new OrderDetailPage(page);
    await od.goto(testOrderId);
    await page.waitForTimeout(2000); // Wait for mock to settle
    
    // Open bulk receive
    await od.openBulkReceive();

    // Verify UI logic
    const modal = page.locator('ion-modal').filter({ hasText: /receive/i }).last();
    await expect(modal).toBeVisible();

    // Assert the accordion text values
    await expect(modal.locator('ion-accordion').locator('text="Total Ordered"').locator('..')).toContainText('5');
    await expect(modal.locator('ion-accordion').locator('text="Total Shipped"').locator('..')).toContainText('5');

    // Default is usually Shipped, discrepancy should be 0 (no badge or '0 discrepancy')
    const badge = modal.locator('ion-badge[color="danger"]');
    await expect(badge).not.toBeVisible();

    // Select Ordered, discrepancy should still be 0
    await modal.getByRole('radio', { name: /Remaining ordered/i }).click();
    await expect(badge).not.toBeVisible();
  });

  test("Scenario 2 — Partially shipped", async ({ page }) => {
    await mockOrderQuantities(page, 5, 3, 0);
    const od = new OrderDetailPage(page);
    await od.goto(testOrderId);
    await page.waitForTimeout(2000); // Wait for mock to settle
    
    // Open bulk receive
    await od.openBulkReceive();

    const modal = page.locator('ion-modal').filter({ hasText: /receive/i }).last();
    await expect(modal).toBeVisible();

    // Select Shipped
    await modal.getByRole('radio', { name: /Remaining (shipped|issued)/i }).click();
    const badge = modal.locator('ion-badge[color="danger"]');
    await expect(badge).not.toBeVisible();

    // Select Ordered
    await modal.getByRole('radio', { name: /Remaining ordered/i }).click();
    // Expect +2 discrepancy badge
    await expect(badge).toContainText('+2');
  });

  test("Scenario 3 — Already partially received", async ({ page }) => {
    await mockOrderQuantities(page, 5, 5, 2);
    const od = new OrderDetailPage(page);
    await od.goto(testOrderId);
    await page.waitForTimeout(2000); // Wait for mock to settle
    
    // Open bulk receive
    await od.openBulkReceive();

    const modal = page.locator('ion-modal').filter({ hasText: /receive/i }).last();
    await expect(modal).toBeVisible();

    // Remaining ordered should be 3, Remaining shipped should be 3
    await expect(modal.locator('ion-accordion').locator('text="To be received"').locator('..')).toContainText('3');
    
    const badge = modal.locator('ion-badge[color="danger"]');
    await expect(badge).not.toBeVisible();
  });

  test("Scenario 4 — Ordered but not shipped", async ({ page }) => {
    await mockOrderQuantities(page, 1, 0, 0);
    const od = new OrderDetailPage(page);
    await od.goto(testOrderId);
    await page.waitForTimeout(2000); // Wait for mock to settle
    
    // Open bulk receive
    await od.openBulkReceive();
    const modal = page.locator('ion-modal').filter({ hasText: /receive/i }).last();
    await expect(modal).toBeVisible();

    // Shipped option should be disabled since shippedQty = 0
    const shippedRadio = modal.getByRole('radio', { name: /Remaining (shipped|issued)/i });
    await expect(shippedRadio).toHaveAttribute('aria-disabled', 'true');

    // Select Ordered
    await modal.getByRole('radio', { name: /Remaining ordered/i }).click();
    
    // Expect +1 discrepancy badge
    const badge = modal.locator('ion-badge[color="danger"]');
    await expect(badge).toContainText('+1');
  });

  test("Scenario 5 — Already received everything", async ({ page }) => {
    await mockOrderQuantities(page, 5, 5, 5);
    const od = new OrderDetailPage(page);
    await od.goto(testOrderId);
    await page.waitForTimeout(2000); // Wait for mock to settle
    
    // The bulk receive button shouldn't even be available if everything is received,
    // but if it is, the modal should say 0 to be received.
    const bulkButton = page.getByRole('button', { name: 'BULK_RECEIVE' });
    if (await bulkButton.isVisible()) {
      await od.openBulkReceive();
      const modal = page.locator('ion-modal').filter({ hasText: /receive/i }).last();
      await expect(modal.locator('ion-accordion').locator('text="To be received"').locator('..')).toContainText('0');
    }
  });

  test("Scenario 6 — Post-receive status (Over received)", async ({ page }) => {
    // Ordered 1, Shipped 0, Received 1 (as in the screenshot provided)
    await mockOrderQuantities(page, 1, 0, 1, 'ITEM_COMPLETED', 'ORDER_COMPLETED');
    const od = new OrderDetailPage(page);
    await od.goto(testOrderId);
    await page.waitForTimeout(2000); // Wait for mock to settle
    
    // Check Item row for badges
    const overReceivedBadge = page.locator('ion-badge', { hasText: 'Over received' });
    await expect(overReceivedBadge.first()).toBeVisible();

    const completedBadge = page.locator('ion-badge', { hasText: 'Completed' });
    await expect(completedBadge.first()).toBeVisible();

    // Check Summary section chips
    const discrepanciesChip = page.locator('ion-chip', { hasText: /Over received/i });
    await expect(discrepanciesChip.first()).toBeVisible();
    await expect(discrepanciesChip.first()).toContainText('1'); // Over received (1)
  });
});
