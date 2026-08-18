const { expect } = require('@playwright/test');
const { BaseSalesOrderPage } = require('./base.page');

class SalesOrderBrokerPage extends BaseSalesOrderPage {



  async clickBrokerAndSave() {
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
    if (!isApproved) {
       console.warn('Order never reached Approved status. Proceeding anyway, but action may fail.');
    }

    // 1. Click "Broker now"
    const brokerNowBtn = this.page.locator('a:has-text("Broker now")').or(this.page.locator('button:has-text("Broker now")')).first();
    await brokerNowBtn.waitFor({ state: 'visible', timeout: 10000 });
    await brokerNowBtn.click();

    // 2. Select first routing option in the modal
    const routingRadio = this.page.locator('input[type="radio"]').first();
    await routingRadio.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
       throw new Error('\n[DATA ERROR] Order Routing Groups modal did not open, or no routing groups are available to select.\n');
    });
    await routingRadio.check();

    // 3. Submit (Click Run or Save)
    await this.page.locator('button:has-text("Run"), button:has-text("Save"), input[type="submit"]').first().click();

    // Check for routing configuration error banners that appear after clicking Run (e.g. "No order routing configuration found...")
    const configError = this.page.locator('text=/No order routing configuration found/i').first();
    if (await configError.isVisible({ timeout: 3000 }).catch(() => false)) {
       const errText = await configError.innerText();
       throw new Error(`\n[DATA ERROR] Routing configuration error after running Broker: ${errText}\nTest failed because the routing rules for this group are not active.\n`);
    }

    // 4. Verify Success
    const successMsg = this.page.locator('text="Successfully brokered"').or(this.page.locator('text="Order brokered"')).or(this.page.locator('.toast-success')).or(this.page.locator('.alert-success')).first();
    
    try {
      await expect(successMsg).toBeVisible({ timeout: 15000 });
      console.log('Success message verified.');
    } catch (e) {
      throw new Error('\n[DATA ERROR] Success message was not displayed after Broker Now action.\n');
    }

    // Capture screenshot for validation
    await this.page.screenshot({ path: 'test-results/broker-success.png', fullPage: true });
    console.log('Screenshot captured at test-results/broker-success.png');

    // 5. Verify that "Broker now" button is no longer visible
    if (await brokerNowBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
       // Capture any error banner that might explain why it's still visible
       const anyError = this.page.locator('.alert-danger, .toast-error, .toast-danger, .message-error').first();
       let errMsg = "No explicit error banner found on screen.";
       if (await anyError.isVisible({ timeout: 1000 }).catch(() => false)) {
           errMsg = await anyError.innerText();
       }
       throw new Error(`\n[DATA ERROR] The "Broker now" button is still visible after the brokering action! It should have disappeared.\nSystem Error Captured: ${errMsg}\n`);
    }

    // Explicitly assert it's hidden to satisfy Playwright test constraints
    await expect(brokerNowBtn).toBeHidden();

    console.log('Broker Order action completed and verified successfully.');
  }
}

module.exports = { SalesOrderBrokerPage };
