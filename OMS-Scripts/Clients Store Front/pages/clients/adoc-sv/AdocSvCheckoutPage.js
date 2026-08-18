const { expect } = require('@playwright/test');
const { BaseCheckoutPage } = require('../../shared/BaseCheckoutPage');

class AdocSvCheckoutPage extends BaseCheckoutPage {
  async fillContactDetails(data) {
    // Fill Email
    await this.page.getByRole('textbox', { name: /Email o número/i }).or(this.page.getByPlaceholder(/Email/i)).fill(data.email);
    
    // Select Identification Type
    const idTypeDropdown = this.page.getByRole('combobox').filter({ hasText: /Tipo de identificación/i });
    if (await idTypeDropdown.isVisible()) {
      await idTypeDropdown.selectOption({ label: data.identificationType });
    }

    // Fill Identification Number
    const idInput = this.page.getByPlaceholder(data.identificationType).or(this.page.getByRole('textbox', { name: data.identificationType })).or(this.page.getByLabel(data.identificationType));
    await idInput.first().fill(data.identificationNumber);
    await idInput.first().press('Tab');
    await this.page.waitForTimeout(1000);
  }

  async fillShippingAddress(data) {
    // Fill First and Last Name
    await this.page.getByRole('textbox', { name: /Nombre/i }).first().fill(data.firstName);
    await this.page.getByRole('textbox', { name: /Apellidos/i }).fill(data.lastName);

    // Fill Address
    await this.page.getByRole('textbox', { name: /Dirección/i }).or(this.page.getByPlaceholder(/Dirección/i)).fill(data.address);

    // Fill Apartment
    if (data.apartment) {
      const aptInput = this.page.getByRole('textbox', { name: /Casa, apartamento/i }).or(this.page.getByPlaceholder(/Casa, apartamento/i));
      if (await aptInput.isVisible()) {
        await aptInput.fill(data.apartment);
      }
    }

    // Select Department (combobox)
    const departmentDropdown = this.page.getByRole('combobox', { name: /Departamento/i });
    if (await departmentDropdown.isVisible()) {
      await departmentDropdown.selectOption({ label: data.department });
      // Small wait to allow Region dropdown to populate
      await this.page.waitForTimeout(1000);
    }

    // Select Region/Municipio (combobox)
    const regionDropdown = this.page.getByRole('combobox', { name: /Municipio/i }).or(this.page.getByRole('combobox', { name: /Región/i })).last();
    if (await regionDropdown.isVisible()) {
      await regionDropdown.selectOption({ label: data.region });
      await this.page.waitForTimeout(1000);
    }

    // Fill Postal Code
    await this.page.getByRole('textbox', { name: /Código postal/i }).fill(data.postalCode);

    // Fill Phone
    await this.page.getByRole('textbox', { name: /Teléfono/i }).last().fill(data.phone);
  }

  async selectPaymentMethod(method) {
    // There are multiple payment methods, we find by text or value
    // Assuming method is something like "Depósito Bancario"
    const paymentRadio = this.page.getByRole('radio', { name: new RegExp(method, 'i') }).or(this.page.locator(`input[value="${method}"]`));
    await paymentRadio.check({ force: true });
    await this.page.waitForTimeout(1000);
    
    // Check if a required dropdown appears (e.g. to select a bank)
    const paymentDropdown = this.page.locator('.payment-method-wrapper select, [name="payment_method_dropdown"]').first(); // Or generic combobox
    // Try to find any visible select element in the payment section
    const anySelect = this.page.locator('.step__sections select').last();
    
    if (await anySelect.isVisible()) {
      const options = await anySelect.locator('option').allInnerTexts();
      if (options.length > 1) {
        // Select the second option (index 1) since the first is usually a placeholder
        await anySelect.selectOption({ index: 1 });
        await this.page.waitForTimeout(1000);
      }
    }
    
    // Look for any text or number inputs that appear (e.g. for a reference number)
    // The user mentioned having to enter a numeric value manually
    const paymentInputs = this.page.locator('.step__sections input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])');
    if (await paymentInputs.count() > 0 && await paymentInputs.first().isVisible()) {
        await paymentInputs.first().fill('12345678');
        await this.page.waitForTimeout(500);
    }
  }

  async completePayment(data) {
    // Wait for "Pago" section to be visible
    const paymentHeading = this.page.getByRole('heading', { name: 'Pago', exact: true });
    await expect(paymentHeading).toBeVisible();

    // Select "Depósito Bancario"
    const depositOption = this.page.locator('label', { hasText: /Depósito Bancario/i }).or(this.page.getByText(/Depósito Bancario/i)).first();
    await depositOption.click({ force: true });
    await this.page.waitForTimeout(1000);
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

module.exports = { AdocSvCheckoutPage };
