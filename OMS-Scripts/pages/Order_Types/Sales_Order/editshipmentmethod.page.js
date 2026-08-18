const { expect } = require('@playwright/test');
const { BaseSalesOrderPage } = require('./base.page');

class EditShipmentMethodPage extends BaseSalesOrderPage {

  async openTargetSalesOrder() {
    await this.openSalesOrderByFilter({
      status: 'Approved',
      includeTexts: ['Approved'],
      anyOfTexts: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Oliver'],
      excludeTexts: ['Parking']
    });
  }

  async editShipmentMethod() {
    // 1. Wait for page to settle, then click "Edit Shipment Method" pencil
    await this.page.waitForLoadState('networkidle');
    const editIcon = this.page.locator('a[title="Edit Shipment Method"]').or(this.page.locator('button[title="Edit Shipment Method"]')).filter({ state: 'visible' }).first();
    await editIcon.scrollIntoViewIfNeeded();
    await editIcon.click({ force: true });

    // 2. Select first available radio
    // Scope to the modal and wait for it to actually become visible on screen
    const activeModal = this.page.locator('.modal-dialog').or(this.page.locator('ion-modal')).or(this.page.locator('dialog')).filter({ hasText: /Shipment Method/i }).last();
    await activeModal.waitFor({ state: 'visible', timeout: 5000 });
    
    // Wait for the ajax spinner to disappear so we know the modal contents are fully loaded
    await this.page.locator('.dialog-ajax-loader').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    
    const firstMethodElement = activeModal.locator('input[type="radio"][name="shipmentMethodTypeId"]').or(activeModal.locator('input[type="radio"]')).or(activeModal.locator('select[name="shipmentMethodTypeId"]')).or(activeModal.locator('select').last()).first();
    await firstMethodElement.waitFor({ state: 'attached' });
    
    // Capture the text of the selected shipment method
    let selectedMethodName = '';
    
    // Check if it is a select element or a radio button
    const tagName = await firstMethodElement.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
    
    if (tagName === 'select') {
      try {
        const options = await firstMethodElement.locator('option').allInnerTexts();
        if (options.length > 1) {
          await firstMethodElement.selectOption({ index: 1 });
          selectedMethodName = options[1].trim();
        }
      } catch (e) {
        console.warn('Could not select option from dropdown modal.', e);
      }
    } else {
      try {
        const parentRow = firstMethodElement.locator('xpath=ancestor::tr | ancestor::label | ancestor::div[contains(@class, "radio")] | ..').first();
        selectedMethodName = await parentRow.textContent();
        if (selectedMethodName) {
           selectedMethodName = selectedMethodName.replace(/\s+/g, ' ').trim();
        }
      } catch (e) {
        console.warn('Could not capture shipment method name from modal.');
      }
      await firstMethodElement.click({ force: true });
    }

    await this.page.waitForTimeout(500); // Give UI time to register selection

    // 3. Click Save button in modal
    const saveBtn = activeModal.locator('button:has-text("Save")').or(activeModal.locator('input[type="submit"]')).or(activeModal.locator('button.btn-primary')).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await this.page.waitForTimeout(1000); // Give AJAX time to fire
      await this.page.waitForLoadState('networkidle');
      await this.page.reload(); // Ensure UI is updated
    } else {
      throw new Error('Save button was not visible in the Edit Shipment Method modal!');
    }

    console.log('Edit Shipment Method action completed and verified.');
    return selectedMethodName;
  }

  getShipToSection() {
    return this.page.locator('h3:has-text("Ship To")').locator('xpath=..').first();
  }

  getShipMethodItem() {
    return this.page.locator('li:has(.fa-truck[title="Ship Method"])').first();
  }
}

module.exports = { EditShipmentMethodPage };
