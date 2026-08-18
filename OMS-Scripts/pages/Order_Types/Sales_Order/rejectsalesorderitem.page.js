const { expect } = require('@playwright/test');
const { BaseSalesOrderPage } = require('./base.page');

class RejectSalesOrderItemPage extends BaseSalesOrderPage {

  async ensureOrderIsBrokered() {
    // 0. Ensure order is in Approved status before proceeding
    let isApproved = false;
    for (let i = 0; i < 15; i++) {
       const statusLocator = this.page.locator('text="Approved"').first();
       if (await statusLocator.isVisible().catch(() => false)) {
          isApproved = true;
          break;
       }
       
       // Proactively click the "Approve" button if it's available (bypassing slow backend jobs)
       const approveBtn = this.page.locator('a:has-text("Approve"), button:has-text("Approve")').first();
       if (await approveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('Order is in Created status. Proactively clicking "Approve" button...');
          await approveBtn.click();
          await this.page.waitForTimeout(3000);
          await this.page.reload();
          await this.page.waitForLoadState('networkidle');
       } else {
          console.log('Waiting for order to reach Approved status...');
          await this.page.waitForTimeout(3000);
          await this.page.reload();
          await this.page.waitForLoadState('networkidle');
       }
    }

    const brokerNowBtn = this.page.locator('a:has-text("Broker now")').or(this.page.locator('button:has-text("Broker now")')).first();
    if (await brokerNowBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Order is not brokered. Clicking "Broker now"...');
      await brokerNowBtn.click({ force: true });
      
      console.log('Waiting for order to be assigned to a facility (Reject button visible)...');
      let isBrokered = false;
      for (let i = 0; i < 15; i++) {
        await this.page.waitForTimeout(2000);
        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
        
        const rejectBtn = this.page.locator('a[title="Reject Item"]').or(this.page.locator('button[title="Reject Item"]')).first();
        if (await rejectBtn.isVisible().catch(() => false)) {
          isBrokered = true;
          break;
        }
      }
      if (!isBrokered) {
        console.warn('Reject button never appeared after clicking Broker now. Attempting manual Release Item fallback...');
        
        // 1. Look for manual "Release Item" link
        const releaseItemBtn = this.page.locator('a:has-text("Release Item")').or(this.page.locator('button:has-text("Release Item")')).first();
        if (await releaseItemBtn.isVisible().catch(() => false)) {
          await releaseItemBtn.click();
          
          // 2. Wait for modal "Release Order Item To Facility"
          const releaseModal = this.page.locator('.modal-dialog:visible, .modal-content:visible, .modal.show, .modal[style*="display: block"]').filter({ hasText: /Release Order Item To Facility/i }).first();
          await releaseModal.waitFor({ state: 'visible', timeout: 10000 });
          
          // Check for any red error banners that pop up
          const errorBanner = this.page.locator('.alert-danger, .toast-error, .toast-danger, .message-error').first();
          if (await errorBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
             const errorText = await errorBanner.innerText();
             throw new Error(`\n[DATA ERROR] System displayed an error preventing manual release: ${errorText}\nTest failed because the item cannot be assigned to a facility.\n`);
          }

          // 3. Look for a radio button to select a facility
          const facilityRadio = releaseModal.locator('input[type="radio"]').first();
          if (await facilityRadio.isVisible().catch(() => false)) {
             await facilityRadio.check();
             // 4. Click Save
             await releaseModal.locator('button:has-text("Save")').first().click();
             await expect(releaseModal).toBeHidden({ timeout: 15000 });
             
             // 5. Reload to see updated Reject Item button
             await this.page.waitForLoadState('networkidle');
             await this.page.reload();
             await this.page.waitForLoadState('networkidle');
          } else {
             const errorBanner = this.page.locator('.alert-danger, .toast-error, .toast-danger, .message-error').first();
             let extraError = "";
             if (await errorBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
                 extraError = await errorBanner.innerText();
             }
             throw new Error(`\n[DATA ERROR] Release Item modal showed "No records found". Cannot assign manually.\nAdditional System Error: ${extraError}\n`);
          }
        } else {
           console.warn('Manual Release Item link not found on page.');
        }
      }
    }
  }

  async clickRejectItemAndSaveReason() {
    // 1. Click "Reject Item"
    const rejectBtn = this.page.locator('a[title="Reject Item"]').or(this.page.locator('button[title="Reject Item"]')).first();
    if (!(await rejectBtn.isVisible().catch(() => false))) {
      throw new Error('\n[DATA ERROR] Reject Item button is not visible. The order was likely never assigned to a facility by the brokering engine.\n');
    }
    await rejectBtn.click();

    // 2. Select first rejection reason
    const activeModal = this.page.locator('.modal.show, .modal[style*="display: block"]').first();
    const reasonRadio = activeModal.locator('input[type="radio"]').first();
    await reasonRadio.waitFor({ state: 'visible' });
    await reasonRadio.check();

    // 3. Click Save/Submit in modal
    const saveBtn = activeModal.locator('button:has-text("Save"), button:has-text("Reject")').first();
    await saveBtn.click();
    
    // 4. VERIFY STATE: Ensure modal closes
    await expect(activeModal).toBeHidden({ timeout: 10000 });

    // 5. VERIFY STATE: Ensure the "Reject Item" button disappears
    // (since it's now rejected and unassigned)
    await expect(rejectBtn).toBeHidden({ timeout: 15000 });

    // 6. VERIFY STATE: Ensure the order drops back into the Rejected Queue (as per business logic docs)
    const shipFromSection = this.page.locator('.card-header, .panel-heading').filter({ hasText: /Ship From/i }).locator('xpath=following-sibling::*').first();
    await expect(shipFromSection).toContainText(/Rejected Queue/i, { timeout: 10000 });

    console.log('Reject Item action completed and verified.');
  }

  async rejectAllItemsAndSaveReason() {
    console.log('Starting Full Rejection flow for all items in the order...');
    let itemsRejected = 0;
    
    // Loop continuously as long as there is at least one "Reject Item" button visible
    while (true) {
       const rejectBtn = this.page.locator('a[title="Reject Item"]').or(this.page.locator('button[title="Reject Item"]')).first();
       
       if (!(await rejectBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
          // No more reject buttons! Break out.
          console.log(`No more Reject buttons found. Total items rejected: ${itemsRejected}`);
          break;
       }
       
       console.log(`Rejecting item #${itemsRejected + 1}...`);
       await rejectBtn.click();

       const activeModal = this.page.locator('.modal.show, .modal[style*="display: block"]').first();
       const reasonRadio = activeModal.locator('input[type="radio"]').first();
       await reasonRadio.waitFor({ state: 'visible', timeout: 5000 });
       await reasonRadio.check();

       const saveBtn = activeModal.locator('button:has-text("Save"), button:has-text("Reject")').first();
       await saveBtn.click();
       
       await expect(activeModal).toBeHidden({ timeout: 10000 });
       
       // Wait for the UI to settle after rejection (button should disappear or page might reload)
       await this.page.waitForTimeout(3000); 
       itemsRejected++;
    }

    if (itemsRejected === 0) {
      throw new Error('\n[DATA ERROR] No "Reject Item" buttons were found. The order was likely never assigned to a facility by the brokering engine.\n');
    }

    // After all items are rejected, VERIFY STATE: Ensure the entire order drops back into the Rejected Queue
    const shipFromSection = this.page.locator('.card-header, .panel-heading').filter({ hasText: /Ship From/i }).locator('xpath=following-sibling::*').first();
    await expect(shipFromSection).toContainText(/Rejected Queue/i, { timeout: 15000 });

    console.log('Full Reject Order action completed and verified.');
  }
}

module.exports = { RejectSalesOrderItemPage };
