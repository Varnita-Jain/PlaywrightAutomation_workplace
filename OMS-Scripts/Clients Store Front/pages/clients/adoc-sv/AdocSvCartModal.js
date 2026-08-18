const { BaseCartModal } = require('../../shared/BaseCartModal');

class AdocSvCartModal extends BaseCartModal {
  getAddToCartButton() {
    // In the quick view modal, the add to cart is a <button>.
    // On the product grid, it's a link (<a>). This distinction allows us to uniquely target the modal button.
    return this.page.getByRole('button', { name: /Agregar al carrito/i, exact: false })
      .or(this.page.locator('button.add-to-cart, button#AddToCart'));
  }

  async addToCartFromQuickView() {
    // The quick view modal in this theme doesn't use standard .modal classes.
    // We bypass the wrapper check and directly wait for the modal's Add to Cart button to appear.
    const addBtn = this.getAddToCartButton();
    await addBtn.first().waitFor({ state: 'visible' });
    await addBtn.first().click();
  }

  getCartConfirmationModal() {
    // Generic robust locator for shopify cart drawer/modal
    return this.page.locator('.modal, #cart-drawer, .ajax-cart-container, #CartDrawer');
  }

  async proceedToCheckout() {
    // The theme doesn't use standard cart drawer classes. It shows a notification toast/modal.
    // We bypass the wrapper check and directly wait for the Checkout button to appear.
    const checkoutBtn = this.getCheckoutButton();
    await checkoutBtn.first().waitFor({ state: 'visible' });
    await checkoutBtn.first().click();
  }

  getCheckoutButton() {
    // Matches <button class="btn btn-primary" onclick="window.location='/checkout'">Finalizar pedido</button>
    return this.page.getByRole('button', { name: /Finalizar pedido/i, exact: false })
      .or(this.page.getByText('Finalizar pedido', { exact: false }));
  }
}

module.exports = { AdocSvCartModal };
