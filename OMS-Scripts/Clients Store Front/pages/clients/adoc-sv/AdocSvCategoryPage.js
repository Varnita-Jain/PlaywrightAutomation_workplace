const { BaseCategoryPage } = require('../../shared/BaseCategoryPage');

class AdocSvCategoryPage extends BaseCategoryPage {
  getProductCard() {
    // Filter by items that actually have an image to ensure it's a product card
    return this.page.locator('.grid__item, .product-card, .product-item, .item')
               .filter({ has: this.page.locator('img') })
               .first();
  }

  getQuickAddButton(productCard) {
    // Strictly target the quick-view icon ( or +) to ensure the modal opens.
    // We must avoid clicking "Agregar al carrito" directly on the card to follow the required test flow.
    return productCard.getByText('', { exact: true })
      .or(productCard.getByText('+', { exact: true }))
      .or(productCard.locator('.fa-search, .quick-view').first());
  }

  async quickAddFirstProduct() {
    const product = this.getProductCard();
    await product.waitFor({ state: 'attached' });
    
    const quickAddBtn = this.getQuickAddButton(product);
    // Use native DOM click via evaluate to bypass strict Playwright viewport bounding box checks
    // This solves the issue where slider items are deemed 'visible' but are clipped by overflow:hidden.
    await quickAddBtn.evaluate(btn => btn.click());
  }
}

module.exports = { AdocSvCategoryPage };
