class AdocPaProductPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  async selectAvailableVariants() {
    // Select Color
    const colorSwatches = this.page.locator('.swatch-element.color label, .color-swatch, .variant-input[data-option-name="Color"] label, [data-option="option1"] label, ul[data-property="color"] a, li.color a, [data-value] a:not([href*="product"])');
    if (await colorSwatches.count() > 0) {
      const firstAvailableColor = colorSwatches.locator(':not(.soldout):not(.disabled):not(.out-of-stock)').first();
      if (await firstAvailableColor.isVisible().catch(() => false)) {
        await firstAvailableColor.click({ force: true });
        await this.page.waitForTimeout(500);
      } else {
        await colorSwatches.first().click({ force: true });
        await this.page.waitForTimeout(500);
      }
    }

    // Select Size (Talla)
    const sizeSwatches = this.page.locator('.swatch-element.talla label, .size-swatch, .variant-input[data-option-name="Talla"] label, [data-option="option2"] label');
    
    // We can just try to click sizes directly using class matching since text contains whitespace
    const genericSizeSwatches = this.page.locator('ul.options-talla a, ul.options-size a');
    
    const sizesToTry = await sizeSwatches.count() > 0 ? sizeSwatches : genericSizeSwatches;
    
    const count = await sizesToTry.count();
    let foundAvailable = false;
    for (let i = 0; i < count; i++) {
      await sizesToTry.nth(i).click({ force: true });
      await this.page.waitForTimeout(1000); // wait for button to update
      
      const isSoldOut = await this.page.locator('button[type="submit"][name="add"]').innerText().then(t => t.toLowerCase().includes('agotado')).catch(() => true);
      if (!isSoldOut) {
        foundAvailable = true;
        break; // Found an available variant!
      }
    }
    
    if (!foundAvailable && count > 0) {
      throw new Error("No available variants found for this product. All sizes are out of stock.");
    }
  }

  async clickAddToCart() {
    const addToCartBtn = this.page.locator('button[type="submit"][name="add"]').first()
      .or(this.page.getByRole('button', { name: /Agregar al carrito/i, exact: false }).first());
    
    // The button might be disabled initially while Shopify's theme JS loads inventory data
    try {
      await this.page.waitForFunction(() => {
        const btn = document.querySelector('button[type="submit"][name="add"]');
        return btn && !btn.disabled;
      }, { timeout: 10000 });
    } catch (e) {
      // Ignore timeout, we'll try to click anyway
    }
    
    await addToCartBtn.waitFor({ state: 'visible', timeout: 15000 });
    await addToCartBtn.click({ force: true });
    
    // Wait for the AJAX cart/add request to complete before navigating away!
    await this.page.waitForResponse(response => response.url().includes('/cart/add') && response.status() === 200, { timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(1500); // Safety buffer to ensure cart is updated
  }
}

module.exports = { AdocPaProductPage };
