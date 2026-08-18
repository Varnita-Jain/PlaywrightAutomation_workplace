const { expect } = require('@playwright/test');

class BaseCartModal {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }
  
  getQuickViewModal() {
    return this.page.locator('.modal').or(this.page.getByRole('dialog'));
  }

  getAddToCartButton() {
    return this.getQuickViewModal().getByRole('button', { name: /add to cart/i });
  }

  getCartConfirmationModal() {
    return this.page.locator('.cart-modal');
  }

  getCheckoutButton() {
    return this.getCartConfirmationModal().getByRole('button', { name: /checkout/i });
  }

  async addToCartFromQuickView() {
    const modal = this.getQuickViewModal();
    // Verify modal is displayed before continuing
    await expect(modal.first()).toBeVisible();

    const addBtn = this.getAddToCartButton();
    await addBtn.first().waitFor({ state: 'visible' });
    await addBtn.first().click();
  }

  async proceedToCheckout() {
    const cartModal = this.getCartConfirmationModal();
    await expect(cartModal.first()).toBeVisible();

    const checkoutBtn = this.getCheckoutButton();
    await checkoutBtn.first().waitFor({ state: 'visible' });
    await checkoutBtn.first().click();
  }
}

module.exports = { BaseCartModal };
