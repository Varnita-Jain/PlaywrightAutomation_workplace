const { BaseStorefrontHomePage } = require('../../shared/BaseStorefrontHomePage');

class MephistoHomePage extends BaseStorefrontHomePage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {Object} config
   */
  constructor(page, config) {
    super(page, config);
  }

  async openPrimaryCategory() {
    await this.page.waitForLoadState('domcontentloaded');
    
    // Attempt to click the first prominent category link (Men's or Women's usually)
    // You might need to adjust this locator once the actual storefront DOM is known.
    const categoryLink = this.page.getByRole('link', { name: /Men|Women|Shoes|Shop/i }).first();
    await categoryLink.waitFor({ state: 'visible' });
    await categoryLink.click();
    
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { MephistoHomePage };
