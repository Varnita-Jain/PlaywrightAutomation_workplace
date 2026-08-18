const { expect } = require('@playwright/test');

class ThirdLoveCategoryPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  async clickFirstProduct() {
    console.log('Finding the first product on the category page...');
    
    // Based on DOM extraction, product links use class "js-link" with relative paths
    const firstProductLink = this.page.locator('a.js-link[href^="/products/"]').first();
    await firstProductLink.waitFor({ state: 'visible', timeout: 15000 });
    
    const productUrl = await firstProductLink.getAttribute('href');
    console.log(`Clicking product: ${productUrl}`);
    
    await firstProductLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { ThirdLoveCategoryPage };
