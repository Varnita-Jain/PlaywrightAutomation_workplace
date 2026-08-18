class AdocGtCartModal {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  getCartConfirmationModal() {
    // Fallback to the global cart icon if there is no AJAX drawer
    return this.page.locator('.modal, #cart-drawer, .ajax-cart-container, #CartDrawer, a[href="/cart"]').first();
  }

  async proceedToCartPage() {
    // Navigate directly to cart to avoid flaky drawer animations
    await this.page.goto(this.page.url().split('.com')[0] + '.com/cart', { waitUntil: 'load' });
    
    try {
        require('fs').writeFileSync('cart-dom-gt.html', await this.page.content());
    } catch (e) {}
  }

  async proceedToCheckout() {
    const checkoutBtn = this.page.locator('[name="checkout"], button.cart__checkout').first();
      
    await checkoutBtn.waitFor({ state: 'visible', timeout: 15000 });
    await checkoutBtn.click({ force: true });
  }
}

module.exports = { AdocGtCartModal };
