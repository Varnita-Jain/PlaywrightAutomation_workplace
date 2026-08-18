const { BaseCartModal } = require('../../shared/BaseCartModal');
const { expect } = require('@playwright/test');

class MephistoCartModal extends BaseCartModal {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {Object} config
   */
  constructor(page, config) {
    super(page, config);
  }

  async proceedToCheckout() {
    // Navigate directly to checkout to avoid finicky drawer interactions
    const checkoutUrl = new URL('/checkout', this.page.url()).href;
    await this.page.goto(checkoutUrl);

    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { MephistoCartModal };
