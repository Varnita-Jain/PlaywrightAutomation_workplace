const { expect } = require('@playwright/test');

class BaseCheckoutPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  async verifyCheckoutPage(expectedHeading) {
    await this.page.waitForLoadState('domcontentloaded');
    const heading = this.page.getByRole('heading', { name: expectedHeading, exact: false });
    await expect(heading.first()).toBeVisible();
    expect(this.page.url()).toContain('shopify');
  }
}

module.exports = { BaseCheckoutPage };
