class AdocPaCategoryPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  async openFirstProductPDP() {
    const productGrid = this.page.locator('.product-grid, .grid-product, .grid-view-item, .product-item, .collection-grid').first();
    await productGrid.waitFor({ state: 'visible', timeout: 30000 });

    const products = this.page.locator('a[href*="/products/"]:not([href*="quick"]):not(:has-text("Vista rápida"))');
    await products.first().waitFor({ state: 'visible', timeout: 15000 });
    
    // We'll click the second product to have a higher chance of it being in stock
    // Often the very first product is a new release that sells out quickly
    const productToClick = (await products.count() > 1) ? products.nth(1) : products.first();
    await productToClick.click({ force: true });
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { AdocPaCategoryPage };
