const { expect } = require('@playwright/test');

class ThirdLoveProductPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  async selectSize() {
    console.log('Checking for size options...');
    
    // Many bras require both Band and Cup size selection
    // The inputs are often hidden, so we target the visible label spans
    const genericSizeOptions = this.page.locator('label.js-sizes-label:not(.disabled)');
    
    // Wait for at least one size option to appear (could be up to 5s if dynamically loaded)
    try {
        await genericSizeOptions.first().waitFor({ state: 'attached', timeout: 5000 });
    } catch (e) {
        console.log('No size options appeared within 5 seconds.');
    }

    const bandSizeOptions = this.page.locator('label.js-sizes-label:not(.disabled) input[name="band"] + span.js-size-label, label.js-sizes-label:not(.disabled):has(input[name="band"])');
    const cupSizeOptions = this.page.locator('label.js-sizes-label:not(.disabled) input[name="cup"] + span.js-size-label, label.js-sizes-label:not(.disabled):has(input[name="cup"])');

    if (await bandSizeOptions.count() > 0) {
      console.log('Selecting Band size...');
      await bandSizeOptions.first().click({ force: true });
      await this.page.waitForTimeout(500);
    }
    
    if (await cupSizeOptions.count() > 0) {
      console.log('Selecting Cup size...');
      await cupSizeOptions.first().click({ force: true });
      await this.page.waitForTimeout(500);
    }
    
    if (await bandSizeOptions.count() === 0 && await cupSizeOptions.count() === 0 && await genericSizeOptions.count() > 0) {
      console.log('Selecting Generic size...');
      await genericSizeOptions.first().click({ force: true });
      await this.page.waitForTimeout(500);
    }
  }

  async addToBag() {
    console.log('Adding product to bag...');
    const addToBagBtn = this.page.locator('button.js-add-to-bag, .add-to-bag-btn').first();
    await addToBagBtn.waitFor({ state: 'visible', timeout: 10000 });
    
    // Scroll into view if needed
    await addToBagBtn.scrollIntoViewIfNeeded();
    await addToBagBtn.click();
  }

  async proceedToCheckout() {
    console.log('Waiting for cart drawer and proceeding to checkout...');
    
    // Wait for mini cart checkout button
    const checkoutBtn = this.page.locator('.js-checkout-button, .component-cart-footer-checkout-button').first();
    
    await checkoutBtn.waitFor({ state: 'visible', timeout: 15000 });
    
    // Ensure it's not disabled (sometimes JS disables it while cart is loading)
    await expect(checkoutBtn).not.toHaveAttribute('disabled', '', { timeout: 15000 });
    
    console.log('Clicking checkout button...');
    await checkoutBtn.click();
    
    // The URL should transition to checkout
    // Wait for checkout page or password/login
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { ThirdLoveProductPage };
