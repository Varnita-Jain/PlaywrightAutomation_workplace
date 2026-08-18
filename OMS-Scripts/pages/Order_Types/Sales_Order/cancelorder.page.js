const { expect } = require('@playwright/test');
const { BaseSalesOrderPage } = require('./base.page');

class CancelOrderPage extends BaseSalesOrderPage {

  async openTargetSalesOrder(status = 'Approved') {
    // Open an order with the specified status and created by one of our automated names
    await this.openSalesOrderByFilter({ 
      status, 
      anyOfTexts: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Oliver'] 
    });
  }

  async cancelOrder(confirm = true, isCreatedOrder = false, onBeforeConfirm = null) {
    // 1. Wait for page to settle and click "Cancel Order" button
    await this.page.waitForLoadState('networkidle');
    
    // Auto-detect if we need to open a dropdown
    const cancelBtn = this.page.locator('a[title="Cancel Order"]').or(this.page.locator('a:has-text("Cancel Order")')).first();
    const isVisible = await cancelBtn.isVisible().catch(() => false);

    if (!isVisible || isCreatedOrder) {
      console.log('Cancel button not directly visible, opening action dropdown...');
      const dropdownToggle = this.page.locator('button.dropdown-toggle:has(.caret)').or(this.page.locator('.btn-group .dropdown-toggle')).filter({ state: 'visible' }).first();
      await dropdownToggle.click().catch(() => {});
      await this.page.waitForTimeout(500); // Wait for menu animation
    }

    await cancelBtn.scrollIntoViewIfNeeded();
    await cancelBtn.click({ force: true });

    // 2. Wait for the "Cancel Order" modal to be visually open
    const cancelModal = this.page.locator('.modal-dialog').or(this.page.locator('ion-modal')).or(this.page.locator('dialog')).filter({ hasText: /Cancel Order/i }).last();
    await cancelModal.waitFor({ state: 'visible', timeout: 5000 });

    // Wait for the ajax spinner to disappear (if present)
    await this.page.locator('.dialog-ajax-loader').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => { });

    // 3. Select a cancellation reason (e.g. BAD_REVIEW or the first available option)
    const reasonRadio = cancelModal.locator('input[type="radio"][name="changeReason"]').or(cancelModal.locator('input[type="radio"]')).first();
    await reasonRadio.waitFor({ state: 'attached' });
    await reasonRadio.click({ force: true });

    await this.page.waitForTimeout(500); // Give UI time to register selection

    // 4. Click the "Yes" or "No" button based on confirm flag
    if (onBeforeConfirm) {
        await onBeforeConfirm();
    }
    if (confirm) {
      const yesBtn = cancelModal.locator('button.btn-danger:has-text("Yes")').or(cancelModal.locator('button[type="submit"]:has-text("Yes")')).first();
      await yesBtn.click();
      await this.page.waitForTimeout(1000); // Give AJAX time to fire
      await this.page.waitForLoadState('networkidle');
      await this.page.reload(); // Reload to ensure order status updates
    } else {
      const noBtn = cancelModal.locator('button:has-text("No")').or(cancelModal.locator('a:has-text("No")')).or(cancelModal.locator('button[data-dismiss="modal"]')).first();
      await noBtn.click();
      await cancelModal.waitFor({ state: 'hidden', timeout: 5000 }); // Wait for modal to close
    }

    console.log(`Cancel Order action completed (confirmed: ${confirm}).`);
  }

  async approveOrder() {
    console.log('Approving the order...');
    await this.page.waitForLoadState('networkidle');
    
    const approveBtn = this.page.locator('button:has-text("Approve")').or(this.page.locator('[title*="Approve"]')).or(this.page.locator('a:has-text("Approve")')).filter({ state: 'visible' }).first();
    const isVisible = await approveBtn.isVisible().catch(() => false);
    if (isVisible) {
      await approveBtn.click({ force: true });
    } else {
      console.log('Approve button not found, assuming order is already approved.');
      return;
    }
    
    // Wait for the AJAX loader to finish if it exists
    await this.page.locator('.dialog-ajax-loader').or(this.page.locator('.spinner')).waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    
    await this.page.waitForLoadState('networkidle');
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    console.log('Order approved successfully.');
  }

  async getOrderStatusRow() {
    // Target the first data row in the Items table (which specifically has the "Product" column)
    const statusRow = this.page.locator('table:has(th:has-text("Product"))').locator('tbody tr').first();
    
    // Safely attempt to scroll into view without crashing if it's considered non-scrollable
    await statusRow.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    
    return statusRow;
  }
}

module.exports = { CancelOrderPage };
