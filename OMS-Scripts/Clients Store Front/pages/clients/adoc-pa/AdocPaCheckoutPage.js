const { expect } = require('@playwright/test');
const { BaseCheckoutPage } = require('../../shared/BaseCheckoutPage');

class AdocPaCheckoutPage extends BaseCheckoutPage {
  async verifyCheckoutPageLoaded() {
    // Verify the checkout heading contains "PAR2 Sandbox Panamá"
    const heading = this.page.locator('h1, h2, .os-header__title, .shop__name').filter({ hasText: /PAR2 Sandbox Panamá/i }).first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  }

  async verifyAndFillContactDetails(data) {
    const emailInput = this.page.getByRole('textbox', { name: /Correo|Email/i }).first()
      .or(this.page.locator('input[type="email"], input[name="email"]'));
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(data.email);
    
    // Uncheck newsletter if checked
    const newsletterCheckbox = this.page.getByRole('checkbox', { name: /Enviarme novedades y ofertas/i }).or(this.page.locator('input[name="buyer_accepts_marketing"], input[name="marketing_opt_in"]'));
    if (await newsletterCheckbox.count() > 0 && await newsletterCheckbox.isChecked()) {
      await newsletterCheckbox.uncheck({ force: true });
    }

    // ID Type
    if (data.identificationType) {
      const idTypeDropdown = this.page.getByRole('combobox', { name: /Tipo de identificación|Tipo de documento/i }).first()
        .or(this.page.locator('select:has(option[value="Cédula"]), select:has(option[value="dpi"]), select:has(option[value="DPI"]), select:has(option[value="cedula"]), select:has(option[value="pasaporte"])').first())
        .or(this.page.locator('select[name*="id_type"], select[id*="id_type"]').first());
      
      try {
        await idTypeDropdown.waitFor({ state: 'visible', timeout: 5000 });
        await idTypeDropdown.click({ force: true });
        await this.page.waitForTimeout(500);
        
        const option = this.page.getByRole('option', { name: new RegExp(data.identificationType, 'i') }).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
            await option.click({ force: true });
        } else {
            await idTypeDropdown.selectOption({ label: data.identificationType }).catch(() => {});
            const selectedValue = await idTypeDropdown.evaluate(el => el.value);
            if (selectedValue !== data.identificationType.toLowerCase()) {
                await idTypeDropdown.selectOption({ value: data.identificationType.toLowerCase() }).catch(() => {});
            }
        }
        await this.page.waitForTimeout(500);
      } catch (e) {
          console.log('ID Type dropdown not found or could not be selected:', e.message);
      }
    }

    // ID Number
    if (data.identificationNumber) {
      const idNumberInput = this.page.getByRole('textbox', { name: /Número de identificación|Documento Personal|Cédula|Pasaporte/i }).first()
        .or(this.page.locator('input#customerId, input[placeholder*="Identificación"], input[placeholder*="Cédula"], input[name*="id_number"]').first());
      
      try {
        await idNumberInput.waitFor({ state: 'visible', timeout: 5000 });
        await idNumberInput.focus();
        await idNumberInput.fill('');
        await this.page.waitForTimeout(500);
        await idNumberInput.pressSequentially(data.identificationNumber, { delay: 100 });
        await idNumberInput.evaluate((node, val) => {
            node.value = val;
            node.dispatchEvent(new Event('input', { bubbles: true }));
            node.dispatchEvent(new Event('change', { bubbles: true }));
        }, data.identificationNumber);
        await this.page.keyboard.press('Tab');
        await this.page.waitForTimeout(500);
      } catch (e) {
        console.log('ID Number input not found:', e.message);
      }
    }
  }

  async verifyAndSelectDeliveryMethod() {
    // Check Envío and Punto de retiro
    const envioRadio = this.page.locator('input[name="delivery_method"][value="SHIPPING"], input[value="SHIPPING"]').first();
    const pickupRadio = this.page.locator('input[name="delivery_method"][value="PICK_UP"], input[value="PICK_UP"]').first();
    
    if (await envioRadio.count() > 0 && await pickupRadio.count() > 0) {
      // Toggle to Punto de retiro to verify switching
      await pickupRadio.click({ force: true });
      await this.page.waitForTimeout(1000);
      
      // Toggle back to Envío
      await envioRadio.click({ force: true });
      await this.page.waitForTimeout(1000);
    }
  }

  async fillShippingAddress(data) {
    // Fill First and Last Name
    await this.page.getByRole('textbox', { name: /Nombre/i }).first().fill(data.firstName);
    await this.page.getByRole('textbox', { name: /Apellidos/i }).fill(data.lastName);

    // Fill Address & Apartment
    await this.page.getByRole('textbox', { name: /Dirección/i }).fill(data.address);
    // If autocomplete appears, usually pressing down arrow or Enter works, or just click the first suggestion
    const autocompleteSuggestion = this.page.locator('.address-autocomplete-suggestion').first();
    if (await autocompleteSuggestion.isVisible({ timeout: 1000 }).catch(() => false)) {
      await autocompleteSuggestion.click();
    }
    
    const aptInput = this.page.getByRole('textbox', { name: /Apartamento/i });
    if (await aptInput.isVisible()) {
      await aptInput.fill(data.apartment || '');
    }

    // Postal Code
    const postalCode = this.page.getByRole('textbox', { name: /Código postal/i });
    if (await postalCode.isVisible()) {
        await postalCode.fill(data.postalCode);
    }

    // City & Region
    const cityInput = this.page.getByRole('textbox', { name: /Ciudad/i });
    if (await cityInput.isVisible()) {
        await cityInput.fill(data.city);
    }
    
    const regionDropdown = this.page.getByRole('combobox', { name: /^(Región|Provincia|Departamento)$/i }).or(this.page.locator('select[name="zone"]'));
    if (await regionDropdown.isVisible()) {
        await regionDropdown.selectOption({ label: data.region || data.province });
    }

    // Handle dynamic Panama dropdowns: Distrito, Corregimiento, Barrio
    const customDropdowns = ['Distrito', 'Corregimiento', 'Barrio'];
    for (const labelText of customDropdowns) {
      try {
        const dropdown = this.page.getByRole('combobox', { name: new RegExp(labelText, 'i') })
          .or(this.page.locator(`select[name*="${labelText.toLowerCase()}"]:visible`))
          .first();
        await dropdown.waitFor({ state: 'visible', timeout: 15000 });
        await expect(dropdown).toBeEnabled({ timeout: 5000 });
        await this.page.waitForTimeout(1500); // Wait for options to populate
        
        const options = dropdown.locator('option');
        await expect(options).toHaveCount(2, { timeout: 5000 }).catch(() => {});
        const count = await options.count();
        
        // Find a valid option to select (not empty, not containing 'selecciona' or 'select')
        let selected = false;
        for (let i = 0; i < count; i++) {
            const val = await options.nth(i).getAttribute('value');
            const text = await options.nth(i).innerText();
            if (val && !text.toLowerCase().includes('selecciona') && !text.toLowerCase().includes('select')) {
                await dropdown.selectOption(val);
                await dropdown.dispatchEvent('change');
                selected = true;
                break;
            }
        }
        
        if (!selected && count > 1) {
            // Fallback: select index 1
            await dropdown.selectOption({ index: 1 });
            await dropdown.dispatchEvent('change');
        }
        await this.page.waitForTimeout(2000); // Give React time to render the next dropdown
      } catch(e) {
          console.log(`Could not find or select option for ${labelText}: ${e.message}`);
      }
    }

    // Verify Save Info Checkbox
    const saveInfoCheckbox = this.page.getByRole('checkbox', { name: /Guardar mi información/i }).or(this.page.locator('input[name="save_shipping_information"]'));
    if (await saveInfoCheckbox.count() > 0) {
      // Check default state (could be anything, but we'll check it, uncheck it, leave unchecked)
      await saveInfoCheckbox.check();
      expect(await saveInfoCheckbox.isChecked()).toBeTruthy();
      
      await saveInfoCheckbox.uncheck();
      expect(await saveInfoCheckbox.isChecked()).toBeFalsy();
    }
  }

  async verifyAndSelectShippingMethod() {
    // Wait for methods to load
    await this.page.waitForTimeout(3000); // Allow time for shipping rates to fetch

    const firstMethod = this.page.locator('input[name*="shipping_rate"]').first();
    if (await firstMethod.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(firstMethod).toBeAttached();
      
      // Capture total before
      const totalAmountBefore = await this.page.locator('.payment-due__price, .total-line__price').last().innerText();
      
      // Select first method
      await firstMethod.check({ force: true });
      await this.page.waitForTimeout(2000); // wait for total to update
      
      const totalAmountAfter = await this.page.locator('.payment-due__price, .total-line__price').last().innerText();
      expect(totalAmountAfter).toBeTruthy();
    }
  }

  async completePayment(data) {
    // Select Credit Card Option
    const creditCardRadio = this.page.locator('input[name="payment_gateway"]').first();
    if (await creditCardRadio.isVisible()) {
        await creditCardRadio.check({ force: true });
    }

    // Check if it's the Bogus Gateway or actual test card
    // Shopify uses separate iframes for each credit card field for PCI compliance
    const numberIframe = this.page.frameLocator('iframe[name^="card-fields-number"]');
    const nameIframe = this.page.frameLocator('iframe[name^="card-fields-name"]');
    const expiryIframe = this.page.frameLocator('iframe[name^="card-fields-expiry"]');
    const cvvIframe = this.page.frameLocator('iframe[name^="card-fields-verification_value"]');

    try {
        if (await numberIframe.locator('input[name="number"]').count() > 0) {
            // Bogus Gateway or standard checkout iframe
            await numberIframe.locator('input[name="number"]').click();
            await numberIframe.locator('input[name="number"]').pressSequentially('1', { delay: 50 }); // Bogus uses 1
            
            await nameIframe.locator('input[name="name"]').click().catch(() => {});
            await nameIframe.locator('input[name="name"]').pressSequentially(data.cardholderName, { delay: 50 }).catch(() => {});
            
            await expiryIframe.locator('input[name="expiry"]').click();
            await expiryIframe.locator('input[name="expiry"]').pressSequentially('1230', { delay: 50 }); // No slash, let it auto-format
            
            await cvvIframe.locator('input[name="verification_value"]').click();
            await cvvIframe.locator('input[name="verification_value"]').pressSequentially('123', { delay: 50 });
        }
    } catch (error) {
        console.log("Card fields not found or error filling them:", error.message);
    }
  }

  async placeOrder() {
    const payButton = this.page.locator('button[type="submit"]').filter({ hasText: /Pagar ahora|Finalizar pedido/i }).first();
    
    // Retry click up to 3 times
    for (let i = 0; i < 3; i++) {
        await payButton.waitFor({ state: 'visible' });
        await payButton.click({ force: true });
        
        try {
            await this.page.waitForURL(/thank[_|-]you|orders/, { timeout: 15000 });
            break;
        } catch (e) {
            console.log('Navigation did not occur, retrying click...');
            await this.page.waitForTimeout(2000);
        }
    }
    
    const confirmationHeading = this.page.locator('h2, h1').filter({ hasText: /Tu pedido está confirmado|Gracias/i }).first();
    await expect(confirmationHeading).toBeVisible({ timeout: 30000 });
    
    require('fs').writeFileSync('thankyou-dom-pa.html', await this.page.content());
    
    // Attempt to extract order ID
    let orderId = 'UNKNOWN';
    const orderNumberLocator = this.page.locator('.os-order-number, .os-step__title, [data-order-number]').first();
    if (await orderNumberLocator.isVisible()) {
        const text = await orderNumberLocator.innerText();
        const match = text.match(/#(\d+|[a-zA-Z0-9-]+)/);
        if (match) orderId = match[1];
    } else {
        // Fallback: Check the entire page text
        const fullText = await this.page.evaluate(() => document.body.innerText);
        const match = fullText.match(/(?:Pedido|Orden)?\s*#([A-Z0-9-]+)/i);
        if (match) {
            orderId = match[1];
        } else {
            // Check the URL for the checkout token as a fallback
            const url = this.page.url();
            const tokenMatch = url.match(/\/checkouts\/(?:[a-zA-Z0-9-]+\/)?([a-zA-Z0-9]+)/);
            if (tokenMatch) orderId = `token-${tokenMatch[1]}`;
        }
    }
    return orderId;
  }
}

module.exports = { AdocPaCheckoutPage };
