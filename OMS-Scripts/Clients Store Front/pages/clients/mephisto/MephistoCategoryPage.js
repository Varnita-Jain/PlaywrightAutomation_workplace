const { BaseCategoryPage } = require('../../shared/BaseCategoryPage');
const { expect } = require('@playwright/test');

class MephistoCategoryPage extends BaseCategoryPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {Object} config
   */
  constructor(page, config) {
    super(page, config);
  }

  async openFirstAvailableProduct() {
    const firstProductLink = this.page.locator('a[href*="/products/"]').first();
    await firstProductLink.waitFor({ state: 'attached' });
    const href = await firstProductLink.getAttribute('href');
    if (href) {
      const fullUrl = new URL(href, this.page.url()).href;
      await this.page.goto(fullUrl);
    } else {
      await firstProductLink.click({ force: true });
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async selectProductSize() {
    // Find size selector if it exists and select first available size
    const sizeTexts = ['9', '10', '11', '8', 'M', 'L'];
    
    for (const size of sizeTexts) {
      const sizeElements = this.page.getByText(size, { exact: true });
      const count = await sizeElements.count();
      
      for (let i = 0; i < count; i++) {
        const el = sizeElements.nth(i);
        if (await el.isVisible()) {
          const isDisabled = await el.evaluate((node) => {
            const parent = node.closest('button, label, div');
            return parent && (
              parent.classList.contains('disabled') || 
              parent.hasAttribute('disabled') ||
              parent.getAttribute('aria-disabled') === 'true'
            );
          });
          
          if (!isDisabled) {
            await el.click({ force: true });
            await this.page.waitForTimeout(500);
            return;
          }
        }
      }
    }
  }

  async addProductToBag() {
    const addToBagBtn = this.page.locator('button[name="add"], button.add-to-cart-button').first();
    await addToBagBtn.waitFor({ state: 'visible' });
    await addToBagBtn.click();
    // Wait for the cart API request to complete before navigating away
    await this.page.waitForTimeout(3000);
  }
}

module.exports = { MephistoCategoryPage };
