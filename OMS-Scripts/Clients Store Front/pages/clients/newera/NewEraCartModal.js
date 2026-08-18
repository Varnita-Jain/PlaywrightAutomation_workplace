const { BaseCartModal } = require('../../shared/BaseCartModal');
const { expect } = require('@playwright/test');

class NewEraCartModal extends BaseCartModal {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {Object} config
   */
  constructor(page, config) {
    super(page, config);
  }

  /**
   * Selects the guest purchase option
   */
  async continueAsGuest() {
    // Scroll if necessary and locate Guest purchase radio button
    const guestRadio = this.page.getByRole('radio', { name: /Guest purchase|ゲスト購入/i })
      .or(this.page.locator('input[type="radio"][value*="guest"]')).first();
    
    // Use evaluate to click the hidden radio button bypassing all viewport/visibility checks
    await guestRadio.evaluate((node) => node.click());
  }

  /**
   * Clicks the proceed to checkout button
   */
  async proceedToCheckout() {
    // Wait for UI to update after selecting Guest Purchase
    await this.page.waitForTimeout(1000);
    
    // There are multiple buttons on the page (e.g. Login to Purchase, Proceed to Checkout), some are hidden.
    // We locate all potential checkout buttons and click the first one that is actually visible.
    const checkoutButtons = this.page.locator('.btn--checkout, button[name="checkout"], a:has-text("購入手続き"), button:has-text("購入手続き"), a:has-text("ゲスト"), button:has-text("ゲスト")');
    
    const count = await checkoutButtons.count();
    for (let i = 0; i < count; i++) {
        const btn = checkoutButtons.nth(i);
        if (await btn.isVisible()) {
            await btn.click();
            break;
        }
    }

    // Wait for the Shopify checkout page to load completely
    await this.page.waitForURL(/.*checkout.*/i, { timeout: 30000 });
  }
}

module.exports = { NewEraCartModal };
