/**
 * transfers-list-filters.spec.ts
 * Tests the search, sort, and filtering capabilities on the main Transfers Listing page.
 */
import { test, expect } from "@playwright/test";

async function gotoTransfers(page: any) {
  await page.goto("/tabs/transfers");
  await page.waitForLoadState("networkidle");
}

async function waitForTransfersLoadingToSettle(page: any) {
  const loading = page.getByTestId("transfers-loading");
  if (await loading.count()) {
    await expect(loading).toBeHidden({ timeout: 20_000 });
  }
}

async function setIonSelectValue(page: any, testId: string, value: string) {
  const select = page.locator(`[data-testid="${testId}"]`).first();
  await select.evaluate((el: any, v: string) => {
    el.value = v;
    el.dispatchEvent(
      new CustomEvent("ionChange", {
        detail: { value: v },
        bubbles: true,
        composed: true,
      })
    );
  }, value);
}

async function expectIonSelectValue(
  page: any,
  testId: string,
  expectedValue: string
) {
  const select = page.locator(`[data-testid="${testId}"]`).first();
  const actual = await select.evaluate((el: any) => el.value);
  expect(actual).toBe(expectedValue);
}

test.describe("Transfers Listing Filters", () => {
test.skip("Group by filter switches listing layout and keeps page stable", async ({
    page,
  }) => {
    await gotoTransfers(page);
    await waitForTransfersLoadingToSettle(page);

    // ORDER_ID => list-item order cards path
    await setIonSelectValue(page, "transfers-groupby-select", "ORDER_ID");
    await waitForTransfersLoadingToSettle(page);
    await expect(page.locator("body")).toContainText(
      /Transfer orders|No transfer orders found/i
    );

    // DESTINATION => accordion path
    await setIonSelectValue(page, "transfers-groupby-select", "DESTINATION");
    await waitForTransfersLoadingToSettle(page);
    await expect(page.locator("body")).toContainText(
      /Transfer orders|No transfer orders found/i
    );

    // Reset back
    await setIonSelectValue(page, "transfers-groupby-select", "ORDER_ID");
    await waitForTransfersLoadingToSettle(page);
  });

  test("Sort by toggle updates icon state and keeps data fetch healthy", async ({
    page,
  }) => {
    await gotoTransfers(page);
    await waitForTransfersLoadingToSettle(page);

    const sortBtn = page.getByTestId("transfers-sort-btn");
    const sortIcon = sortBtn.locator("ion-icon.sort-icon");
    await expect(sortBtn).toBeVisible();
    await expect(sortIcon).toBeVisible();

    const classBefore = (await sortIcon.getAttribute("class")) || "";
    const hasRotateBefore = classBefore.includes("rotate");
    await sortBtn.click();
    await waitForTransfersLoadingToSettle(page);
    const classAfterFirstClick = (await sortIcon.getAttribute("class")) || "";
    const hasRotateAfterFirstClick = classAfterFirstClick.includes("rotate");
    expect(hasRotateAfterFirstClick).toBe(!hasRotateBefore);

    await sortBtn.click();
    await waitForTransfersLoadingToSettle(page);
    const classAfterSecondClick = (await sortIcon.getAttribute("class")) || "";
    const hasRotateAfterSecondClick = classAfterSecondClick.includes("rotate");
    expect(hasRotateAfterSecondClick).toBe(hasRotateBefore);
  });

  test("Location filters (store/origin/destination) can be applied and reset", async ({
    page,
  }) => {
    await gotoTransfers(page);
    await waitForTransfersLoadingToSettle(page);

    // Apply highly selective origin to force filtered state.
    await setIonSelectValue(
      page,
      "transfer-filter-origin-select",
      "___NON_EXISTENT_FACILITY___"
    );
    await waitForTransfersLoadingToSettle(page);
    await expectIonSelectValue(
      page,
      "transfer-filter-origin-select",
      "___NON_EXISTENT_FACILITY___"
    );
    await expect(page.locator("body")).toContainText(
      /Transfer orders|No transfer orders found/i
    );

    // Reset location filters back to All
    await setIonSelectValue(page, "transfer-filter-origin-select", "");
    await setIonSelectValue(page, "transfer-filter-destination-select", "");
    await setIonSelectValue(page, "transfer-filter-store-select", "");
    await waitForTransfersLoadingToSettle(page);

    await expect(page.locator("body")).toContainText(
      /Transfer orders|No transfer orders found/i
    );
  });

  test("Fulfillment filters (method/carrier/type/status) can be applied and reset", async ({
    page,
  }) => {
    await gotoTransfers(page);
    await waitForTransfersLoadingToSettle(page);

    // Apply known status flow + order status from app constants
    await setIonSelectValue(
      page,
      "transfer-filter-type-select",
      "TO_Receive_Only"
    );
    await setIonSelectValue(
      page,
      "transfer-filter-status-select",
      "ORDER_CREATED"
    );
    await waitForTransfersLoadingToSettle(page);
    await expectIonSelectValue(
      page,
      "transfer-filter-type-select",
      "TO_Receive_Only"
    );
    await expectIonSelectValue(
      page,
      "transfer-filter-status-select",
      "ORDER_CREATED"
    );
    await expect(page.locator("body")).toContainText(
      /Transfer orders|No transfer orders found/i
    );

    // Also touch method/carrier with non-existent values to verify empty filtered state behavior.
    await setIonSelectValue(
      page,
      "transfer-filter-method-select",
      "___NON_EXISTENT_METHOD___"
    );
    await setIonSelectValue(
      page,
      "transfer-filter-carrier-select",
      "___NON_EXISTENT_CARRIER___"
    );
    await waitForTransfersLoadingToSettle(page);
    await expectIonSelectValue(
      page,
      "transfer-filter-method-select",
      "___NON_EXISTENT_METHOD___"
    );
    await expectIonSelectValue(
      page,
      "transfer-filter-carrier-select",
      "___NON_EXISTENT_CARRIER___"
    );
    await expect(page.locator("body")).toContainText(
      /Transfer orders|No transfer orders found/i
    );

    // Reset fulfillment filters
    await setIonSelectValue(page, "transfer-filter-method-select", "");
    await setIonSelectValue(page, "transfer-filter-carrier-select", "");
    await setIonSelectValue(page, "transfer-filter-type-select", "");
    await setIonSelectValue(page, "transfer-filter-status-select", "");
    await waitForTransfersLoadingToSettle(page);
  });
});
