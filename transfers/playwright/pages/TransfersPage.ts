/**
 * Page Object Model for the main Transfers Listing page.
 * Handles searching, sorting, and filtering transfer orders.
 */
import { Page } from '@playwright/test';

export class TransfersPage {
  page: Page;
  createOrderBtn: any;
  loadingState: any;
  emptyState: any;
  transfersSearchInput: any;

  constructor(page: Page) {
    this.page = page;
    this.createOrderBtn = null;
    this.loadingState = page.getByTestId('transfers-loading');
    this.emptyState = page.getByTestId('transfers-empty');
    this.transfersSearchInput = page.getByTestId('transfers-search-input');
  }

  async goto() {
    const base = process.env.BASE_URL || '';
    await this.page.goto(`${base}/transfers`);
    await this.page.waitForLoadState('networkidle');
  }

  async selectOrderWithStatus(status: string) {
    const orderRow = this.page.locator('.section-header, .list-item', {
      has: this.page.locator('ion-badge', { hasText: status })
    }).first();
    await orderRow.scrollIntoViewIfNeeded();
    await orderRow.click();
  }

  async clickCreateOrder() {
    const byRole = this.page.getByRole('button', { name: /Create transfer order/i });
    if ((await byRole.count()) > 0) {
      await byRole.first().click();
      return;
    }
    const byTestId = this.page.getByTestId('transfers-create-btn');
    if ((await byTestId.count()) > 0) await byTestId.first().click();
  }
}
