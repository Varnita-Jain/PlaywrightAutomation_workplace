const { BaseCheckoutPage } = require('../../shared/BaseCheckoutPage');
const { expect } = require('@playwright/test');

class MephistoCheckoutPage extends BaseCheckoutPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {Object} config
   */
  constructor(page, config) {
    super(page, config);
  }

  async verifyCheckoutPage() {
    await this.page.waitForLoadState('domcontentloaded');
    // Ensure we are on checkout page
    expect(this.page.url()).toContain('checkout');
  }

  async fillContactDetails(contact) {
    const emailInput = this.page.getByRole('textbox', { name: /Email/i }).first();
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(contact.email);
  }

  async fillDeliveryAddress(shipping) {
    // Fill first name
    await this.page.getByRole('textbox', { name: /First name/i }).first().fill(shipping.firstName);

    // Fill last name
    await this.page.getByRole('textbox', { name: /Last name/i }).first().fill(shipping.lastName);

    // Fill address
    // It's a combobox because of Google Autocomplete
    const addressInput = this.page.locator('input[name="address1"], [name="address1"], [placeholder*="Address"]').first();
    await addressInput.fill(shipping.address);
    // Click the first suggestion if it appears or just blur to accept
    await this.page.keyboard.press('Escape');

    // Fill city
    await this.page.getByRole('textbox', { name: /City/i }).first().fill(shipping.city);

    // Select state
    await this.page.getByRole('combobox', { name: /State/i }).first().selectOption({ label: shipping.state });

    // Fill postal code
    await this.page.getByRole('textbox', { name: /ZIP code/i }).first().fill(shipping.postalCode);

    // Fill phone if present
    const phoneInput = this.page.getByRole('textbox', { name: /Phone/i }).first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(shipping.phone);
    }
  }

  async selectShippingMethod() {
    // Wait for shipping rates to load
    await this.page.waitForTimeout(2000);

    // Attempt to click 'Continue to payment' or wait for standard shipping
    const continueBtn = this.page.getByRole('button', { name: /Continue to payment|Continue to shipping/i });
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      await this.page.waitForTimeout(1500);
    }
  }

  async completePayment(payment) {
    const paymentFormIframe = this.page.frameLocator('iframe.card-fields-iframe').first();

    if (await paymentFormIframe.locator('input[name="number"]').isVisible().catch(() => false)) {
      // It's the standard Shopify Bogus Gateway iframe format
      await paymentFormIframe.locator('input[name="number"]').fill(payment.cardNumber);

      const nameIframe = this.page.frameLocator('iframe[name*="card-fields-name"]').first();
      await nameIframe.locator('input[name="name"]').fill(payment.cardholderName);

      const expiryIframe = this.page.frameLocator('iframe[name*="card-fields-expiry"]').first();
      await expiryIframe.locator('input[name="expiry"]').fill(payment.expiry);

      const cvvIframe = this.page.frameLocator('iframe[name*="card-fields-verification_value"]').first();
      await cvvIframe.locator('input[name="verification_value"]').fill(payment.cvv);
    } else {
      console.log('Payment fields might not be in the standard iframe format or Bogus Gateway is disabled.');
    }
  }

  async placeOrder() {
    const payButton = this.page.getByRole('button', { name: /Pay now|Complete order/i });
    await payButton.waitFor({ state: 'visible' });
    await payButton.click();

    // Wait for the thank you page
    await this.page.waitForURL(/.*\/thank[-_]you.*/, { timeout: 30000 });

    const orderNumberElement = this.page.locator('.os-order-number, .checkout-receipt__header, .thank-you__order-number').first();
    await orderNumberElement.waitFor({ state: 'visible' });
    const orderText = await orderNumberElement.innerText();
    const orderIdMatch = orderText.match(/#(\d+)/);
    const orderId = orderIdMatch ? orderIdMatch[1] : orderText.replace(/\D/g, '');

    return orderId;
  }
}

module.exports = { MephistoCheckoutPage };
