/**
 * routing-sanity-check.spec.ts
 * A lightweight sanity check to ensure tab navigation works without crashing.
 */
import { test, expect } from "@playwright/test";

async function gotoTransfers(page: any) {
  await page.goto("/tabs/transfers");
  await page.waitForLoadState("networkidle");
}

test.describe("Tabs Navigation", () => {
  test("User can switch between Transfers, Discrepancies, and Settings tabs", async ({
    page,
  }) => {
    await gotoTransfers(page);

    await expect(page).toHaveURL(/\/tabs\/transfers/);
    await expect(
      page.locator("ion-title", { hasText: "Transfer orders" }).first()
    ).toBeVisible();

    const discrepanciesTab = page.getByTestId("tabs-discrepancies-btn");
    if (await discrepanciesTab.count()) {
      await discrepanciesTab.click();
      await expect(page).toHaveURL(/\/tabs\/discrepancies/);
      await expect(
        page.locator("ion-title", { hasText: "Discrepancies" }).first()
      ).toBeVisible();
    }

    await page.getByTestId("tabs-settings-btn").click();
    await expect(page).toHaveURL(/\/tabs\/settings/);
    await expect(
      page.locator("ion-title", { hasText: "Settings" }).first()
    ).toBeVisible();

    await page.getByTestId("tabs-transfers-btn").click();
    await expect(page).toHaveURL(/\/tabs\/transfers/);
  });
});
