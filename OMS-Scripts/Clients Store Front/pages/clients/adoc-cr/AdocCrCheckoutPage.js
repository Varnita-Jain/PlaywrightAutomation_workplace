const { expect } = require('@playwright/test');
const { BaseCheckoutPage } = require('../../shared/BaseCheckoutPage');

class AdocCrCheckoutPage extends BaseCheckoutPage {
  async fillContactDetails(data) {
    // Fill Email
    await this.page.getByRole('textbox', { name: /Email o número/i }).fill(data.email);
    
    // Select Identification Type if not already Cédula de Identidad
    const idTypeDropdown = this.page.getByRole('combobox', { name: /Tipo de identificación/i });
    if (await idTypeDropdown.isVisible()) {
      await idTypeDropdown.selectOption({ label: data.identificationType });
    }

    // Fill Identification Number dynamically based on the selected type
    const idInput = this.page.getByRole('textbox', { name: new RegExp(data.identificationType, 'i') });
    await idInput.fill(data.identificationNumber);
    // Blur to trigger validation
    await idInput.press('Tab');
    await this.page.waitForTimeout(1000);
  }

  async fillShippingAddress(data) {
    // Fill First and Last Name
    await this.page.getByRole('textbox', { name: /Nombre/i }).first().fill(data.firstName);
    await this.page.getByRole('textbox', { name: /Apellidos/i }).fill(data.lastName);

    // Fill Address
    await this.page.getByRole('textbox', { name: /Dirección/i }).fill(data.address);

    // Fill City
    await this.page.getByRole('textbox', { name: /Ciudad/i }).fill(data.city);

    // Select Province (combobox)
    const provinceDropdown = this.page.getByRole('combobox', { name: /Provincia/i });
    if (await provinceDropdown.isVisible()) {
      await provinceDropdown.selectOption({ label: data.province });
      // Small wait to allow Canton dropdown to populate
      await this.page.waitForTimeout(1000);
    }

    // Select Cantón (combobox)
    const cantonDropdown = this.page.getByRole('combobox', { name: /Cantón/i });
    if (await cantonDropdown.isVisible()) {
      await cantonDropdown.selectOption({ label: data.canton });
      // Small wait to allow Distrito dropdown to populate if it exists
      await this.page.waitForTimeout(1000);
    }

    // Select Distrito (combobox)
    const districtDropdown = this.page.getByRole('combobox', { name: /Distrito/i });
    if (await districtDropdown.isVisible() && data.district) {
      await districtDropdown.selectOption({ label: data.district });
    }

    // Fill Postal Code
    await this.page.getByRole('textbox', { name: /Código postal/i }).fill(data.postalCode);

    // Fill Phone
    await this.page.getByRole('textbox', { name: 'Teléfono', exact: true }).fill(data.phone);
  }

  async completePayment(data) {
    // Wait for "Pago" section to be visible
    const paymentHeading = this.page.getByRole('heading', { name: 'Pago', exact: true });
    await expect(paymentHeading).toBeVisible();

    // Verify "Tarjeta de crédito" is selected (Shopify usually selects it by default, we just ensure it's visible)
    await expect(this.page.getByText('Tarjeta de crédito', { exact: true }).first()).toBeVisible();

    // Fill Credit Card info within Shopify iframes if they are visible
    // Sometimes Shopify pre-selects a saved card, hiding the input fields.
    const numberFrame = this.page.frameLocator('[name^="card-fields-number"]').locator('input#number');
    if (await numberFrame.isVisible({ timeout: 3000 }).catch(() => false)) {
      await numberFrame.fill(data.cardNumber);
      await this.page.frameLocator('[name^="card-fields-name"]').locator('input#name').fill(data.cardholderName);
      await this.page.frameLocator('[name^="card-fields-expiry"]').locator('input#expiry').fill(data.expiry);
      await this.page.frameLocator('[name^="card-fields-verification_value"]').locator('input#verification_value').fill(data.cvv);
      await this.page.keyboard.press('Tab'); // Trigger blur on CVV
      await this.page.waitForTimeout(1000);
    } else {
      console.log('Saved card is already selected. Skipping CC details fill.');
    }
  }

  async placeOrder() {
    // Final wait to ensure all validations and calculations are done
    await this.page.waitForTimeout(3000);

    const payButton = this.page.locator('#checkout-pay-button');
    await expect(payButton).toBeEnabled();
    await payButton.scrollIntoViewIfNeeded();
    await payButton.click({ force: true, delay: 100 });

    // Wait a bit to ensure click was registered
    await this.page.waitForTimeout(2000);

    // Verify order confirmation page by waiting for the success heading
    const confirmationHeading = this.page.getByRole('heading', { name: /Tu pedido está confirmado/i });
    await expect(confirmationHeading).toBeVisible({ timeout: 30000 });
    
    // As requested: check the URL contains "shopify"
    expect(this.page.url().toLowerCase()).toContain('shopify');

    // Add wait for 2 sec
    await this.page.waitForTimeout(2000);

    // Find order ID from URL
    const finalUrl = this.page.url();
    let orderId = 'UNKNOWN';
    // Shopify checkout success URLs often look like:
    // /checkouts/cn/TOKEN/thank-you
    // /checkouts/cn/TOKEN/thank_you
    // /orders/TOKEN
    const match = finalUrl.match(/\/(?:checkouts|orders)(?:\/cn)?\/([a-zA-Z0-9_-]+)/);
    if (match) {
      orderId = match[1];
    } else {
      // Fallback: grab the last segment
      orderId = finalUrl.split('/').filter(Boolean).pop();
    }
    
    return orderId;
  }
}

module.exports = { AdocCrCheckoutPage };
