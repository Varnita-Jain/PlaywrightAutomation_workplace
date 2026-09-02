/**
 * Page Object Model for the Settings tab.
 * Used to configure global app settings like Product Store and identifier.
 */
import { Page, expect } from '@playwright/test';

export class SettingsPage {
  page: Page;
  logoutBtn: any;
  productStoreSelector: any;
  productIdentifierCard: any;
  timeZoneSwitcher: any;
  timeZoneChangeBtn: any;
  timeZoneSearchbar: any;
  timeZoneSaveBtn: any;
  appVersion: any;

  constructor(page: Page) {
    this.page = page;
    this.logoutBtn = page.getByTestId('settings-logout-btn');
    this.productStoreSelector = page.getByTestId('settings-productstore-selector');
    this.productIdentifierCard = page.getByTestId('settings-product-identifier');
    this.timeZoneSwitcher = page.getByTestId('settings-timezone-switcher');
    this.timeZoneChangeBtn = page.getByTestId('time-zone-change-btn');
    this.timeZoneSearchbar = page.getByTestId('time-zone-searchbar');
    this.timeZoneSaveBtn = page.getByTestId('time-zone-save-btn');
    this.appVersion = page.getByTestId('settings-app-version');
  }

  async goto() {
    await this.page.goto('/tabs/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async expectCoreSectionsVisible() {
    await expect(this.logoutBtn).toBeVisible();
    await expect(this.productStoreSelector).toBeVisible();
    await expect(this.productIdentifierCard).toBeVisible();
    await expect(this.appVersion).toBeVisible();
    if (await this.timeZoneSwitcher.count()) {
      await expect(this.timeZoneSwitcher).toBeVisible();
    }
  }

  async openTimeZoneModal() {
    if ((await this.timeZoneChangeBtn.count()) === 0) {
      return false;
    }
    await this.timeZoneChangeBtn.click();
    await expect(this.timeZoneSearchbar).toBeVisible();
    return true;
  }

  async closeTimeZoneModal() {
    await this.page.keyboard.press('Escape');
    await expect(this.timeZoneSearchbar).toHaveCount(0);
  }

  async logout() {
    await this.logoutBtn.click();
  }
}
