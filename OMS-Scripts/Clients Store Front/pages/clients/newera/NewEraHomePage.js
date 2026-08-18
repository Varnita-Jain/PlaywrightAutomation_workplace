const { BaseStorefrontHomePage } = require('../../shared/BaseStorefrontHomePage');

class NewEraHomePage extends BaseStorefrontHomePage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {Object} config
   */
  constructor(page, config) {
    super(page, config);
    // New Era specific locators can go here
  }

  async openHeadwearCategory() {
    // Wait until the storefront home page has fully loaded
    await this.page.waitForLoadState('domcontentloaded');
    
    // Locate the Headwear category and click
    const categoryLink = this.page.getByRole('link', { name: /ヘッドウェア|Headwear/i }).first();
    await categoryLink.waitFor({ state: 'visible' });
    await categoryLink.click();
    
    // Wait for the category page to load completely
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { NewEraHomePage };
