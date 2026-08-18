const { expect } = require('@playwright/test');

class BaseCategoryPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  getProductCard() {
    return this.page.locator('.product-card').first(); // Base generic locator
  }

  getQuickAddButton(productCard) {
    return productCard.getByRole('button', { name: '+' }); // Base generic locator
  }

  async waitForLoadingSpinner() {
    // Wait for spinners to disappear if any
    const spinner = this.page.locator('.spinner, .loading-overlay');
    if (await spinner.count() > 0) {
      await spinner.first().waitFor({ state: 'hidden' });
    }
  }

  async quickAddFirstProduct() {
    await this.waitForLoadingSpinner();
    
    const product = this.getProductCard();
    await product.waitFor({ state: 'visible' });
    await product.hover();

    const quickAddBtn = this.getQuickAddButton(product);
    await quickAddBtn.waitFor({ state: 'visible' });
    await quickAddBtn.click();
  }
}

module.exports = { BaseCategoryPage };
