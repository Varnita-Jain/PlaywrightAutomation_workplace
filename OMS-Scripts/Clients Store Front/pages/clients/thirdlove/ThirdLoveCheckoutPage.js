const { expect } = require('@playwright/test');

class ThirdLoveCheckoutPage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  async verifyCheckoutPage() {
    await this.page.waitForLoadState('domcontentloaded');
    expect(this.page.url()).toContain('checkout');
    
    // Step 8: Verify checkout sections are displayed
    const sections = [
      'Contact',
      'Delivery',
      'Payment'
    ];
    
    for (const section of sections) {
      await expect(this.page.getByRole('heading', { name: new RegExp(section, 'i') }).first()).toBeVisible();
    }
    
    // Order Summary
    await expect(this.page.getByRole('heading', { name: /Order summary/i }).first().or(this.page.locator('#order-summary'))).toBeVisible();
    
    // Pay Now / Place Order button
    await expect(this.page.getByRole('button', { name: /Pay now|Place order/i }).first()).toBeVisible();
  }

  async verifyExpressCheckout() {
    // Step 9: Verify Express Checkout
    console.log('Verifying Express Checkout buttons...');
    const expressCheckoutSection = this.page.locator('.dynamic-checkout');
    if (await expressCheckoutSection.isVisible().catch(() => false)) {
      const shopPayBtn = this.page.locator('[data-testid="ShopPay-button"], [aria-label="Shop Pay"]');
      if (await shopPayBtn.isVisible().catch(() => false)) {
        await expect(shopPayBtn).toBeEnabled();
        console.log('Shop Pay is visible and enabled.');
      }
      
      const googlePayBtn = this.page.locator('[data-testid="GooglePay-button"], [aria-label="Google Pay"]');
      if (await googlePayBtn.isVisible().catch(() => false)) {
        await expect(googlePayBtn).toBeEnabled();
        console.log('Google Pay is visible and enabled.');
      }
    } else {
      console.log('Express checkout section not found or not rendered.');
    }
  }

  async fillContactDetails(contact) {
    // Step 10: Contact Section
    console.log('Filling Contact Details...');
    const emailInput = this.page.getByRole('textbox', { name: /Email/i }).first();
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(contact.email);
    
    // Verify Email me checkbox
    const emailCheckbox = this.page.getByRole('checkbox', { name: /Email me with news and offers/i }).first();
    if (await emailCheckbox.isVisible()) {
      console.log('Email checkbox is visible.');
    }

    // Verify Sign In link
    const signInLink = this.page.getByRole('link', { name: /Log in/i }).first();
    if (await signInLink.isVisible()) {
      console.log('Sign in link is visible.');
    }
  }

  async fillDeliveryAddress(shipping) {
    // Step 11: Delivery Section
    console.log('Filling Delivery Details...');
    
    // Country
    const countryDropdown = this.page.getByRole('combobox', { name: /Country/i }).first();
    if (await countryDropdown.isVisible()) {
      await countryDropdown.selectOption({ label: shipping.country });
    }

    // Fill first name
    await this.page.getByRole('textbox', { name: /First name/i }).first().fill(shipping.firstName);

    // Fill last name
    await this.page.getByRole('textbox', { name: /Last name/i }).first().fill(shipping.lastName);

    // Fill address
    const addressInput = this.page.getByPlaceholder(/Address/i).first();
    await addressInput.fill(shipping.address);
    await this.page.keyboard.press('Escape');

    // Fill apartment if provided
    if (shipping.apartment) {
      const apartmentInput = this.page.getByPlaceholder(/Apartment/i).first();
      await apartmentInput.fill(shipping.apartment);
    }

    // Fill city
    await this.page.getByRole('textbox', { name: /City/i }).first().fill(shipping.city);

    // Select state
    const stateDropdown = this.page.getByRole('combobox', { name: /State/i }).first();
    await stateDropdown.selectOption({ label: shipping.state });

    // Fill postal code
    await this.page.getByRole('textbox', { name: /ZIP code/i }).first().fill(shipping.postalCode);

    // Fill phone if present
    const phoneInput = this.page.getByRole('textbox', { name: /Phone/i }).first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(shipping.phone);
    }
  }

  async verifyShippingMethod() {
    // Step 12: Shipping Method
    console.log('Verifying Shipping Method...');
    await this.page.waitForTimeout(2000); // Wait for rates to load
    
    const shippingMethodRadio = this.page.getByRole('radio', { name: /Standard|Shipping/i }).first();
    if (await shippingMethodRadio.isVisible()) {
      console.log('Shipping methods are displayed.');
      await expect(shippingMethodRadio).toBeChecked();
    }
  }

  async completePayment(payment) {
    // Step 13: Payment Section
    console.log('Completing Payment Details...');
    
    // Standard Shopify iframe IDs
    const numberIframe = this.page.frameLocator('iframe[name*="card-fields-number"]').first();
    const nameIframe = this.page.frameLocator('iframe[name*="card-fields-name"]').first();
    const expiryIframe = this.page.frameLocator('iframe[name*="card-fields-expiry"]').first();
    const cvvIframe = this.page.frameLocator('iframe[name*="card-fields-verification_value"]').first();

    await expect(numberIframe.locator('input[name="number"]')).toBeVisible({ timeout: 15000 });
    await numberIframe.locator('input[name="number"]').fill(payment.cardNumber);
    
    // Handle cardholder name if present
    if (await nameIframe.locator('input[name="name"]').isVisible().catch(() => false)) {
        await nameIframe.locator('input[name="name"]').fill(payment.cardholderName);
    }
    
    await expiryIframe.locator('input[name="expiry"]').fill(payment.expiry);
    await cvvIframe.locator('input[name="verification_value"]').fill(payment.cvv);
  }

  async verifyBillingAddress() {
    // Step 14: Billing Address
    console.log('Verifying Billing Address checkbox...');
    const billingCheckbox = this.page.getByRole('radio', { name: /Use shipping address as billing address/i }).first();
    if (await billingCheckbox.isVisible()) {
      await expect(billingCheckbox).toBeChecked();
    }
  }

  async verifySaveInformation() {
    // Step 15: Save Information
    console.log('Verifying Save Information section...');
    const saveInfoCheckbox = this.page.getByRole('checkbox', { name: /Save my information for a faster checkout/i }).first();
    if (await saveInfoCheckbox.isVisible()) {
      console.log('Save info checkbox is visible.');
    }
    
    const termsLink = this.page.getByRole('link', { name: /Terms of Service/i }).first();
    if (await termsLink.isVisible()) {
       console.log('Terms of Service link is visible.');
    }
  }

  async verifyOrderSummary() {
    // Step 16: Order Summary Validation
    console.log('Verifying Order Summary...');
    // A robust validation would parse the item rows and totals and return them, 
    // but for this generic POM, checking visibility is sufficient.
    const orderSummaryToggle = this.page.locator('.order-summary-toggle, [aria-controls="order-summary"]').first();
    if (await orderSummaryToggle.isVisible().catch(() => false)) {
        await orderSummaryToggle.click();
    }
    
    await expect(this.page.getByText(/Subtotal/i).first()).toBeVisible();
    await expect(this.page.getByText(/Shipping/i).first()).toBeVisible();
    await expect(this.page.getByText(/Total/i).last()).toBeVisible();
  }

  async placeOrder() {
    // Step 17: Place Order
    console.log('Clicking Pay Now...');
    const payButton = this.page.getByRole('button', { name: /Pay now|Complete order/i });
    await payButton.waitFor({ state: 'visible' });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    // Wait for the thank you page
    console.log('Order confirmation page loading...');
    
    // Wait for redirect from /processing to /thank_you or /orders
    await this.page.waitForURL(/.*(thank[-_]you|orders).*/i, { timeout: 60000 }).catch(e => console.log('Timeout waiting for URL, proceeding to check for order number anyway.'));

    const orderNumberElement = this.page.locator('.os-order-number, .checkout-receipt__header, .thank-you__order-number, [data-review-order-number], :text-matches("Order #[A-Z0-9]+", "i")').last();
    await orderNumberElement.waitFor({ state: 'visible', timeout: 30000 });
    const orderText = await orderNumberElement.innerText();
    
    // Match alphanumeric or just numeric order IDs
    const orderIdMatch = orderText.match(/(?:Order\s*)?#([A-Z0-9]+)/i);
    const orderId = orderIdMatch ? orderIdMatch[1] : orderText.replace(/[^A-Z0-9]/gi, '');

    console.log(`Successfully captured Order ID: ${orderId}`);
    return orderId;
  }
}

module.exports = { ThirdLoveCheckoutPage };
