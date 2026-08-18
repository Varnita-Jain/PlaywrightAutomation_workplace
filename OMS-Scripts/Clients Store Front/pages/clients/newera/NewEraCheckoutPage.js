const { expect } = require('@playwright/test');
const { BaseCheckoutPage } = require('../../shared/BaseCheckoutPage');
const checkoutData = require('../../../data/checkoutData.json');

class NewEraCheckoutPage extends BaseCheckoutPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {Object} config
   */
  constructor(page, config) {
    super(page, config);
    this.data = checkoutData['newera'];
  }

  async verifyCheckoutPageLoaded() {
    // Verify that the Contact Address section is visible
    const contactHeading = this.page.getByRole('heading', { name: /Contact address|連絡先/i });
    await expect(contactHeading).toBeVisible({ timeout: 15000 });
  }

  async fillContactDetails() {
    const emailInput = this.page.getByRole('textbox', { name: /Email|メールアドレス/i });
    await emailInput.fill(this.data.contact.email);
    // Tab out to trigger validation
    await emailInput.press('Tab');
  }

  async fillDeliveryAddress() {
    const shipping = this.data.shipping;

    // Add 1 sec wait time as requested
    await this.page.waitForTimeout(1000);

    // Wait for the delivery section
    const deliveryHeading = this.page.getByRole('heading', { name: /Delivery|配送/i }).first();
    if (await deliveryHeading.isVisible()) {
      await deliveryHeading.scrollIntoViewIfNeeded();
    }

    // Country (default is Japan, so we usually don't need to change it, but wait for it)
    const countrySelect = this.page.locator('select[name="countryCode"]:visible');
    if (await countrySelect.isVisible()) {
      await expect(countrySelect).toHaveValue('JP');
    }

    // Last Name
    const lastNameInput = this.page.locator('input[name="lastName"]:visible');
    await lastNameInput.fill(shipping.lastName);

    // First Name
    const firstNameInput = this.page.locator('input[name="firstName"]:visible');
    await firstNameInput.fill(shipping.firstName);

    // Postal Code
    const postalCodeInput = this.page.locator('input[name="postalCode"]:visible, input[name="zip"]:visible').first();
    await postalCodeInput.fill(shipping.postalCode);
    await postalCodeInput.press('Tab'); // Trigger possible address autocomplete

    await this.page.waitForTimeout(1000); // Wait for potential address lookup

    // Prefecture
    const prefectureSelect = this.page.locator('select[name="zone"]:visible');
    await prefectureSelect.selectOption({ label: shipping.prefecture });

    // Municipality / City
    const cityInput = this.page.locator('input[name="city"]:visible');
    await cityInput.fill(shipping.city);

    // Street Address
    const addressInput = this.page.locator('input[name="address1"]:visible');
    await addressInput.fill(shipping.streetAddress);

    // Building Name
    const buildingInput = this.page.locator('input[name="address2"]:visible');
    await buildingInput.fill(shipping.building);

    // Mobile Phone
    const phoneInput = this.page.locator('input[name="phone"]:visible');
    await phoneInput.fill(shipping.phone);
  }

  async selectShippingMethod() {
    // Wait for shipping methods to appear (usually automatic on Shopify if address is valid)
    // If there is a "Continue to shipping" button, click it first
    const continueToShippingBtn = this.page.getByRole('button', { name: /Continue to shipping|配送方法へ進む/i });
    if (await continueToShippingBtn.isVisible()) {
      await continueToShippingBtn.click();
    }

    // Usually Shopify pre-selects the default shipping method, we just verify it exists
    const shippingMethodRadio = this.page.locator('input[type="radio"][name="shipping_methods"]').first();
    await shippingMethodRadio.waitFor({ state: 'visible', timeout: 15000 });

    // If not checked, check it
    if (!(await shippingMethodRadio.isChecked())) {
      await shippingMethodRadio.check({ force: true });
    }
  }

  async completePayment() {
    // Proceed to payment if needed
    const continueToPaymentBtn = this.page.getByRole('button', { name: /Continue to payment|お支払いへ進む/i });
    if (await continueToPaymentBtn.isVisible()) {
      await continueToPaymentBtn.click();
    }

    // Verify Payment section is visible
    const paymentHeading = this.page.getByRole('heading', { name: /Payment|お支払い/i });
    await expect(paymentHeading).toBeVisible({ timeout: 15000 });

    const payment = this.data.payment;

    // Wait for the iframe to load for Card Number
    const cardIframe = this.page.frameLocator('iframe[title*="Field container for: Card number"], iframe[title*="カード番号"]');
    const cardNumberInput = cardIframe.getByPlaceholder(/Card number|カード番号/i).or(cardIframe.locator('input[name="number"]'));
    await cardNumberInput.waitFor({ state: 'visible', timeout: 15000 });

    // Fill Card Number
    await cardNumberInput.fill(payment.cardNumber);

    // Expiry
    const nameIframe = this.page.frameLocator('iframe[title*="Field container for: Name on card"], iframe[title*="カードの名義人"]');
    const nameInput = nameIframe.getByPlaceholder(/Name on card|カードの名義人/i).or(nameIframe.locator('input[name="name"]'));
    await nameInput.fill(payment.cardholderName);

    // Expiry
    const expiryIframe = this.page.frameLocator('iframe[title*="Field container for: Expiration date"], iframe[title*="有効期限"]');
    const expiryInput = expiryIframe.getByPlaceholder(/Expiration date|有効期限/i).or(expiryIframe.locator('input[name="expiry"]'));
    await expiryInput.fill(payment.expiry);

    // CVV
    const cvvIframe = this.page.frameLocator('iframe[title*="Field container for: Security code"], iframe[title*="セキュリティコード"]');
    const cvvInput = cvvIframe.getByPlaceholder(/Security code|セキュリティコード/i).or(cvvIframe.locator('input[name="verification_value"]'));
    await cvvInput.fill(payment.cvv);

    // Billing address is usually defaulted to 'same as shipping'
  }

  async placeOrder() {
    // Wait for any network activity
    await this.page.waitForTimeout(2000);

    // Click Pay Now
    const payNowBtn = this.page.getByRole('button', { name: /Pay now|今すぐ支払う/i }).first();
    await payNowBtn.scrollIntoViewIfNeeded();
    await payNowBtn.click({ force: true, delay: 100 });

    // Verify order confirmation page
    const confirmationHeading = this.page.getByRole('heading', { name: /Thank you|ありがとうございます|confirmed/i });
    await expect(confirmationHeading).toBeVisible({ timeout: 30000 });

    // Extract Order ID
    await this.page.waitForTimeout(2000);
    const finalUrl = this.page.url();
    let orderId = 'UNKNOWN';
    const match = finalUrl.match(/\/(?:checkouts|orders)(?:\/cn)?\/([a-zA-Z0-9_-]+)/);
    if (match) {
      orderId = match[1];
    } else {
      orderId = finalUrl.split('/').filter(Boolean).pop();
    }

    return orderId;
  }
}

module.exports = { NewEraCheckoutPage };
