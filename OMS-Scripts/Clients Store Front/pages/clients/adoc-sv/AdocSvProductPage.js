const { expect } = require('@playwright/test');

class AdocSvProductPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }
  async selectSize() {
    // Select the first available size that isn't sold out
    const availableSizes = this.page.locator('.swatch-element:not(.soldout) label');
    if (await availableSizes.count() > 0) {
      await availableSizes.first().click();
      await this.page.waitForTimeout(1000); // Wait for size selection to register
    }
  }

  async selectColor() {
    // Select any available color
    const availableColors = this.page.locator('.swatch.option2 .swatch-element:not(.soldout) label');
    if (await availableColors.count() > 0) {
      await availableColors.first().click();
      await this.page.waitForTimeout(500);
    }
  }

  async addToCart() {
    const addToCartBtn = this.page.locator('button[name="add"]').first();
    await expect(addToCartBtn).toBeVisible();
    
    // Wait for the cart update response when clicking add to cart
    const responsePromise = this.page.waitForResponse(response => 
      response.url().includes('/cart/add') || response.url().includes('/cart.js') || response.status() === 200
    ).catch(() => {}); // ignore timeout if no ajax

    await addToCartBtn.click();
    await this.page.waitForTimeout(2000);
    await responsePromise;
  }
}

module.exports = { AdocSvProductPage };
