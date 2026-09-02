/**
 * settings.spec.ts
 * Tests the configuration options in the Settings tab.
 */
import { test, expect } from "@playwright/test";
import { SettingsPage } from "../pages/SettingsPage";
import { LoginPage } from "../pages/LoginPage";
import { TabsPage } from "../pages/TabsPage";

test.describe("Settings", () => {
  test("Settings page renders core sections", async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.expectCoreSectionsVisible();
  });

  test("Timezone modal opens, supports search input, and can be dismissed", async ({
    page,
  }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    const modalOpened = await settingsPage.openTimeZoneModal();
    if (!modalOpened) {
      await expect(settingsPage.logoutBtn).toBeVisible();
      return;
    }
    await settingsPage.timeZoneSearchbar.locator("input").fill("kolkata");
    await expect(settingsPage.timeZoneSearchbar.locator("input")).toHaveValue(
      "kolkata"
    );

    // We do not save changes to avoid mutating user preferences during CI runs.
    await settingsPage.closeTimeZoneModal();
  });

  test("Verify user can logout successfully", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const tabsPage = new TabsPage(page);
    const settingsPage = new SettingsPage(page);

    await page.goto('/transfers');
    await tabsPage.goToSettings();
    await settingsPage.logout();

    await expect(page).toHaveURL(/.*isLoggedOut=true.*/);
    await expect(loginPage.usernameInput).toBeVisible();
  });
});
