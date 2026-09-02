/**
 * Page Object Model for the main bottom navigation Tabs.
 */
import { Page } from '@playwright/test';

export class TabsPage {
  page: Page;
  transfersTabBtn: any;
  settingsTabBtn: any;

  constructor(page: Page) {
    this.page = page;
    this.transfersTabBtn = page.getByRole('tab', { name: 'Transfers' });
    this.settingsTabBtn = page.getByRole('tab', { name: 'Settings' });
  }

  async goToTransfers() {
    await this.transfersTabBtn.click({ force: true });
  }

  async goToSettings() {
    await this.settingsTabBtn.click({ force: true });
  }
}
