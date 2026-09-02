/**
 * Page Object Model for the Order Detail view.
 * Encapsulates logic for approving, receiving, closing, and handling discrepancies
 * for a specific transfer order.
 */
import { Page, expect } from '@playwright/test';

export class OrderDetailPage {
  page: Page;
  statusBadge: any;
  statusSelect: any;
  backBtn: any;
  addItemBtn: any;

  constructor(page: Page) {
    this.page = page;
    // Note: status badge/select are not present as testids in template; use text-based fallbacks
    this.statusBadge = null;
    this.statusSelect = null;
    this.backBtn = page.getByTestId('order-detail-back-btn');
    this.addItemBtn = page.getByRole('button', { name: /add items/i });
  }

  /**
   * Navigates directly to the Order Detail page for a given ID.
   */
  async goto(orderId: string) {
    await this.page.goto(`/order-detail/${orderId}`);
    await this.page.waitForLoadState('networkidle');
    // Wait for the fetching state to resolve
    const loadingEl = this.page.getByTestId('order-detail-loading');
    if (await loadingEl.count() > 0) {
      await expect(loadingEl).toBeHidden({ timeout: 15000 });
    }
  }

  itemRow(itemSeq: string) {
    return this.page.getByTestId(`order-item-row-${itemSeq}`);
  }

  itemCheckbox(itemSeq: string) {
    return this.page.getByTestId(`order-item-checkbox-${itemSeq}`);
  }

  footerButton(actionType: string) {
    // Expected actions: BULK_RECEIVE, CLOSE_FULFILLMENT, APPROVE, CANCEL
    return this.page.getByTestId(`order-footer-${actionType.replace(/_/g, '-').toLowerCase()}`);
  }

  bulkModalConfirm() {
    return this.page.getByTestId('bulk-modal-confirm-btn');
  }

  bulkModalProgress() {
    return this.page.getByTestId('bulk-modal-progress');
  }

  bulkResultsSuccessCount() {
    return this.page.getByTestId('bulk-results-success-count');
  }

  bulkResultsFailCount() {
    return this.page.getByTestId('bulk-results-fail-count');
  }

  bulkModalDoneButton() {
    return this.page.getByTestId('bulk-modal-done-btn');
  }

  async openBulkReceive() {
    await this.footerButton('BULK_RECEIVE').click();
  }

  async clickSelectAll() {
    await this.page.getByTestId('order-items-select-row').click();
  }

  discrepancyChip(chipText: string) {
    return this.page.locator('ion-chip', { hasText: new RegExp(chipText, 'i') });
  }

  badgeWithText(text: string) {
    return this.page.locator('ion-badge', { hasText: text });
  }

  itemActionsButton(itemSeq: string) {
    return this.page.getByTestId(`order-item-actions-btn-${itemSeq}`);
  }

  popoverItemAction(actionType: string) {
    return this.page.getByTestId(`order-item-detail-action-${actionType.toLowerCase()}`);
  }

  /**
   * Clicks the Approve button on the order detail page.
   */
  async approveOrder() {
    // Prefer footer approve button if available
    const footerApprove = this.page.getByTestId('order-footer-approve');
    if ((await footerApprove.count()) > 0) {
      await footerApprove.first().click();
      
      const toast = this.page.locator("ion-toast").last();
      await expect(toast).toBeVisible({ timeout: 10000 });
      try {
        await expect(toast).toContainText(/success|updated/i, { timeout: 3000 });
      } catch (e) {
        const text = await toast.textContent();
        throw new Error(`API Error on Approve: ${text}`);
      }
      return;
    }
    // fallback: try to open a status select by locating 'Approve' radio
    const approveRadio = this.page.getByRole('radio', { name: 'Approve' });
    if ((await approveRadio.count()) > 0) {
      await approveRadio.first().click();
      
      const toast = this.page.locator("ion-toast").last();
      await expect(toast).toBeVisible({ timeout: 10000 });
      try {
        await expect(toast).toContainText(/success|updated/i, { timeout: 3000 });
      } catch (e) {
        const text = await toast.textContent();
        throw new Error(`API Error on Approve: ${text}`);
      }
      return;
    }
  }

  async cancelOrder() {
    await this.statusSelect.click();
    await this.page.getByRole('radio', { name: 'Cancel' }).click();
    const cancelConfirmBtn = this.page.getByRole('button', { name: 'Cancel' });
    await cancelConfirmBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clicks the meatball menu for an item, selects "Edit ordered qty",
   * fills the new quantity in the alert, and saves.
   */
  async editItemQuantity(productId: string, newQuantity: number) {
    const row = this.page.locator('div.list-item', { hasText: new RegExp(productId, 'i') }).first();
    const meatballBtn = row.locator('[data-testid^="order-item-actions-btn-"]');
    await meatballBtn.click();
    
    await this.popoverItemAction('edit').click();
    
    // Fill the ion-alert input
    const quantityInput = this.page.locator('ion-alert input.alert-input').first();
    await expect(quantityInput).toBeVisible();
    await quantityInput.fill(newQuantity.toString());
    
    // Click Save
    const saveBtn = this.page.locator('ion-alert button', { hasText: 'Save' });
    await saveBtn.click();
    
    // Wait for success toast
    const toast = this.page.locator("ion-toast").last();
    await expect(toast).toBeVisible({ timeout: 10000 });
    await expect(toast).toContainText(/success|updated/i, { timeout: 3000 });
  }

  /**
   * Clicks the meatball menu for an item, selects "Remove item",
   * and confirms the removal.
   */
  async removeItem(productId: string) {
    const row = this.page.locator('div.list-item', { hasText: new RegExp(productId, 'i') }).first();
    const meatballBtn = row.locator('[data-testid^="order-item-actions-btn-"]');
    await meatballBtn.click();
    
    await this.popoverItemAction('remove').click();
    
    // Click Confirm on the ion-alert
    const confirmBtn = this.page.locator('ion-alert button', { hasText: 'Confirm' });
    await confirmBtn.click();
    
    // Wait for success toast
    const toast = this.page.locator("ion-toast").last();
    await expect(toast).toBeVisible({ timeout: 10000 });
    await expect(toast).toContainText(/success|removed/i, { timeout: 3000 });
  }

  /**
   * Clicks the ADD ITEMS button to open the Add Product modal.
   */
  async openAddProductModal() {
    await this.addItemBtn.click();
    await expect(this.page.locator('ion-modal').last()).toBeVisible();
  }

  /**
   * Returns locators for elements inside the Add Product modal
   */
  get addProductModal() {
    // Ionic often has multiple modals in the DOM (e.g. streaming-loader-modal)
    // The currently opened modal is usually the last one.
    const modal = this.page.locator('ion-modal').last();
    return {
      modal,
      closeBtn: modal.locator('ion-buttons[slot="start"] ion-button, ion-button.close-btn, ion-icon[name="close-outline"]').first(),
      title: modal.locator('ion-title', { hasText: 'Add product' }),
      searchbar: modal.locator('ion-searchbar'),
      emptyStateImage: modal.locator('img, ion-img, .empty-state-icon').first(),
      emptyStateText: modal.locator('text=Enter a SKU, or product name to search a product')
    };
  }

  async verifyStatus(status: string) {
    // Status appears in the header as an overline; search by visible text
    const locator = this.page.getByText(new RegExp(status, 'i')).first();
    await expect(locator).toBeVisible({ timeout: 15000 });
  }

  async verifyOrderName(name: string) {
    const orderNameHeader = this.page.locator('h1', { hasText: name });
    await expect(orderNameHeader).toBeVisible();
  }

  async verifyItemExists(productId: string) {
    // Find an actual order item row (.list-item) that contains the added SKU
    const itemRow = this.page.locator('.list-item').filter({ hasText: new RegExp(productId, 'i') }).first();
    await expect(itemRow).toBeVisible({ timeout: 10000 });
  }

  async verifyItemIsRemoved(productId: string) {
    const item = this.page.locator('div.list-item', { hasText: new RegExp(productId, 'i') });
    
    // An item is considered removed if it's either completely removed from the DOM
    // OR if it's greyed out/disabled (which happens when it's cancelled)
    const count = await item.count();
    if (count > 0) {
      await expect(item.first()).toHaveClass(/disabled/);
    } else {
      await expect(item).toBeHidden();
    }
  }

  async verifyItemQuantity(productId: string, quantity: number) {
    // Find the item row by productId text and assert the ordered quantity is present
    const row = this.page.locator('div.list-item', { hasText: productId }).first();
    await expect(row).toContainText(quantity.toString());
  }

  async verifyFacilityAssignment(originName: string, destinationName: string) {
    const originCard = this.page.locator('ion-card', { hasText: originName });
    const destinationCard = this.page.locator('ion-card', { hasText: destinationName });
    await expect(originCard).toBeVisible();
    await expect(destinationCard).toBeVisible();
  }
}
