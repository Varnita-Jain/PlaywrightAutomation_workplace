const { BaseCategoryPage } = require('../../shared/BaseCategoryPage');
const { expect } = require('@playwright/test');

class NewEraCategoryPage extends BaseCategoryPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {Object} config
   */
  constructor(page, config) {
    super(page, config);
  }

  /**
   * Selects the first available product and double-clicks its image to open PDP
   */
  async openFirstAvailableProduct() {
    const firstProductImage = this.page.locator('.product-item__image').first();
    await firstProductImage.waitFor({ state: 'visible' });
    
    // Double-click the product image to open the Product Detail Page (PDP)
    await firstProductImage.dblclick();

    // Verify that the Product Detail Page has opened successfully
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Selects the product size on PDP
   */
  async selectProductSize() {
    // Select the first available size that is not disabled.
    // Ensure we are looking inside the product form to avoid site-wide labels (like search)
    const productForm = this.page.locator('form[action*="/cart/add"]').first();
    
    // Check if it's a dropdown
    const select = productForm.locator('select').filter({ hasText: /size|サイズ/i }).first();
    if (await select.isVisible()) {
        const option = await select.locator('option:not([disabled])').nth(1); // skip placeholder
        if (await option.isVisible()) {
           await select.selectOption(await option.getAttribute('value'));
           return;
        }
    }

    // If it's a label-based size selector (standard Shopify UI)
    // New Era uses .js-radios-sizes
    const availableSize = productForm.locator('.js-radios-sizes li, .product-form__input label')
      .filter({ hasNot: this.page.locator('.disabled, [disabled], .sold-out, .out-of-stock') })
      .locator('label')
      .first();
    
    if (await availableSize.isVisible()) {
      await availableSize.click();
    } else {
      // Fallback: just click the first label in the radios list
      const fallbackSize = productForm.locator('.js-radios-sizes label, label').first();
      if (await fallbackSize.isVisible()) {
         await fallbackSize.click();
      }
    }
  }

  /**
   * Adds the product to the shopping bag
   */
  async addProductToBag() {
    const addToBagBtn = this.page.getByRole('button', { name: /Add to Bag|カートに追加|バッグに追加/i }).first();
    await addToBagBtn.click();

    // Wait for the Shopping Bag side drawer to appear and verify heading
    const drawerHeading = this.page.getByRole('heading', { name: /Shopping Bag|ショッピングバッグ/i }).first();
    await expect(drawerHeading).toBeVisible({ timeout: 15000 });
  }
}

module.exports = { NewEraCategoryPage };
