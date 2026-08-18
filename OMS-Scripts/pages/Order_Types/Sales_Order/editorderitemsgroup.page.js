const { expect } = require('@playwright/test');
const { BaseSalesOrderPage } = require('./base.page');

/**
 * Page Object for Editing Order Items Group / Deleting Phone Numbers
 */
class EditOrderItemsGroupPage extends BaseSalesOrderPage {

  constructor(page, baseURL, clientId) {
    super(page, baseURL, clientId);
    this.updatedShippingAddress = null;
  }

  get deletePhoneNumberLink() {
    return this.page.locator('a.js-confirm-me[form^="deletePrimaryPhoneForm"][title="Delete"][data-confirm-message="Are you sure you want to delete phone No. ?"]:has(i.fa.fa-trash-o)').first();
  }

  get editShippingAddressLink() {
    return this.page.locator('a[title="Edit Shipping Address"][data-dialog-href*="EditShipGroupShipInfo"]:has(i.fa.fa-pencil)').first();
  }

  get editShippingAddressModal() {
    return this.page.locator('.modal-dialog:visible, .modal-content:visible').filter({ hasText: 'Edit Shipping Address' }).last();
  }

  /**
   * Navigates to the Sales Order Listing page.
   */
  async navigateToFindOrder() {
    console.log('Navigating to Find Order page...');
    await this.page.setViewportSize({ width: 1920, height: 1080 }).catch(() => {});
    const url = new URL(this.baseURL);
    const targetUrl = `${url.origin}/commerce/control/FindOrder`;
    await this.page.goto(targetUrl);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Selects multiple options in a header filter by its label.
   * @param {string} labelText - The text of the label (e.g., 'Order Status')
   * @param {string[]} options - Array of options to select (e.g., ['Approved', 'Created'])
   */
  async selectHeaderFilters(labelText, options) {
    console.log(`Setting filter "${labelText}" to: ${options.join(', ')}`);

    // Ensure clean workspace
    await this.page.keyboard.press('Escape').catch(() => {});
    
    // Find the label
    const label = this.page.locator('label').filter({ hasText: new RegExp(`^${labelText}$`, 'i') }).first();
    await label.scrollIntoViewIfNeeded().catch(() => {});
    
    // Find the trigger - could be a sibling or inside a parent container
    const container = label.locator('xpath=ancestor::*[contains(@class, "generic") or contains(@class, "field") or contains(@class, "item") or contains(@class, "form-group")][1]').first();
    const dropdownTrigger = container.locator('button, [role="combobox"], .dropdown-toggle, .select-box, .select2-selection').first();
    
    await dropdownTrigger.waitFor({ state: 'visible', timeout: 15000 });
    await dropdownTrigger.click({ force: true });
    
    // Select each option
    for (const optionText of options) {
        console.log(` Selecting option: ${optionText}`);
        
        const option = this.page.locator('.dropdown-menu:visible, .inner:visible, .select2-results:visible, [role="listbox"]:visible, .popover:visible')
            .locator('a.dropdown-item:visible, li:visible, [role="option"]:visible, .select2-results__option:visible, span.text:visible')
            .filter({ hasText: new RegExp(`^${optionText}$`, 'i') })
            .first();
        
        await option.waitFor({ state: 'visible', timeout: 10000 });
        await option.scrollIntoViewIfNeeded().catch(() => {});
        await option.click({ force: true });
        await this.page.waitForTimeout(500); 
    }

    // Close the dropdown
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(500); 
  }

  /**
   * Opens the first order from the listing.
   */
  async openFirstOrder() {
    console.log('Opening the first order from the listing...');
    
    // Some clients apply header filters immediately and show icon-only controls instead of a Search button.
    const searchBtn = this.page.locator('button:has-text("Search"), .btn-primary:has-text("Search")').first();
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await this.page.waitForLoadState('networkidle');
    }

    const orderLinks = this.page.locator('tbody tr:has(a[href*="orderId="]) a[href*="orderId="]');
    await orderLinks.first().waitFor({ state: 'visible', timeout: 10000 });

    const hrefs = await orderLinks.evaluateAll(links => Array.from(new Set(links.map(link => link.href))).slice(0, 10));

    for (const href of hrefs) {
      await this.page.goto(href);
      await this.page.waitForLoadState('networkidle').catch(() => {});

      if (await this.deletePhoneNumberLink.isVisible().catch(() => false)) {
        return;
      }

      console.log(`Order ${href} does not have a deletable primary phone number. Trying next order...`);
    }

    throw new Error(`\n[DATA ERROR] No filtered order found with a deletable primary phone number for ${this.clientId}.\nExpected link: a.js-confirm-me[form^="deletePrimaryPhoneForm"][title="Delete"]\n`);
  }

  async openAnyOrderFromListing() {
    console.log('Opening any order from the current listing...');
    const searchBtn = this.page.locator('button:has-text("Search"), .btn-primary:has-text("Search")').first();
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await this.page.waitForLoadState('networkidle');
    }

    const firstOrderLink = this.page.locator('tbody tr:has(a[href*="orderId="]) a[href*="orderId="]').first();
    await firstOrderLink.waitFor({ state: 'visible', timeout: 10000 });
    await firstOrderLink.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /**
   * Locates and clicks the dustbin icon for deleting a phone number.
   */
  async clickDeletePhoneNumber() {
    console.log('Locating the delete (dustbin) icon...');
    const trashLink = this.deletePhoneNumberLink;
    await trashLink.waitFor({ state: 'visible', timeout: 10000 });
    await trashLink.scrollIntoViewIfNeeded();
    await trashLink.click();
  }

  /**
   * Verifies the delete confirmation modal details.
   */
  async verifyDeleteModal() {
    console.log('Verifying the confirmation modal...');
    const modal = this.page.locator('.modal-dialog:visible, .modal-content:visible').filter({ hasText: 'Are you sure you want to delete phone No. ?' }).last();

    // Verify Buttons
    const noBtn = modal.locator('button.btn.btn-default[data-dismiss="modal"]:has-text("No")');
    const yesBtn = modal.locator('button.btn.btn-primary:has-text("Yes")');
    
    await expect(noBtn).toBeVisible();
    await expect(yesBtn).toBeVisible();
  }

  /**
   * Clicks "No" in the modal and verifies it closes.
   */
  async clickNoAndVerifyClosed() {
    console.log('Clicking "No" and verifying modal closes...');
    const modal = this.page.locator('.modal-dialog:visible, .modal-content:visible').filter({ hasText: 'Are you sure you want to delete phone No. ?' }).last();
    const noBtn = modal.locator('button.btn.btn-default[data-dismiss="modal"]:has-text("No")');
    
    await noBtn.click();
    await expect(modal).toBeHidden({ timeout: 10000 });
  }

  /**
   * Clicks "Yes" in the modal and verifies success message.
   */
  async clickYesAndVerifySuccess() {
    console.log('Clicking "Yes" and verifying deletion...');
    const modal = this.page.locator('.modal-dialog:visible, .modal-content:visible').filter({ hasText: 'Are you sure you want to delete phone No. ?' }).last();
    const yesBtn = modal.locator('button.btn.btn-primary:has-text("Yes")');
    
    // Store the count of delete buttons before clicking
    const trashLinksBefore = await this.deletePhoneNumberLink.count();
    await yesBtn.click();
    
    // VERIFICATION: Ensure the modal closes and the phone number is removed from the DOM
    await expect(modal).toBeHidden({ timeout: 10000 });
    await expect(this.deletePhoneNumberLink).toHaveCount(Math.max(0, trashLinksBefore - 1), { timeout: 15000 });
  }

  async clickEditShippingAddress() {
    console.log('Clicking Edit Shipping Address icon...');
    const editIcon = this.editShippingAddressLink;
    await editIcon.waitFor({ state: 'visible', timeout: 10000 });
    await editIcon.scrollIntoViewIfNeeded();
    await editIcon.click();
  }

  async verifyEditShippingAddressModal() {
    console.log('Verifying Edit Shipping Address modal fields...');
    const modal = this.editShippingAddressModal;
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText('Edit Shipping Address');

    const fields = [
      modal.locator('input[name="toName"]'),
      modal.locator('input[name="attnName"]'),
      modal.locator('input[name="address1"]'),
      modal.locator('input[name="address2"]'),
      modal.locator('select[name="countryGeoId"]'),
      modal.locator('select[name="stateProvinceGeoId"]'),
      modal.locator('input[name="city"]'),
      modal.locator('input[name="postalCode"]')
    ];

    for (const field of fields) {
      await expect(field.first()).toBeVisible();
    }

    await expect(modal.locator('input[name="toName"]')).not.toHaveValue('');
    await expect(modal.locator('input[name="address1"]')).not.toHaveValue('');
    await expect(modal.locator('select[name="countryGeoId"]')).not.toHaveValue('');
    await expect(modal.locator('select[name="stateProvinceGeoId"]')).not.toHaveValue('');
    await expect(modal.locator('input[name="city"]')).not.toHaveValue('');
    await expect(modal.locator('input[name="postalCode"]')).not.toHaveValue('');
  }

  async updateShippingAddress() {
    console.log('Updating shipping address...');
    const modal = this.editShippingAddressModal;
    const countrySelect = modal.locator('select[name="countryGeoId"]');
    const countryOptions = await this.getSelectOptions(countrySelect);
    const supportsUsAddress = countryOptions.some(option => option.value === 'USA' || option.text === 'United States - USA');
    const address = supportsUsAddress
      ? {
        attentionName: 'Front Desk',
        address1: '1600 Amphitheatre Parkway',
        address2: 'Building 3',
        countryValue: 'USA',
        countryLabels: ['United States - USA', 'United States', 'USA'],
        stateValue: 'CA',
        stateLabels: ['California - CA', 'California', 'CA'],
        city: 'Mountain View',
        postalCode: '94043'
      }
      : {
        attentionName: 'Front Desk',
        address1: '1-1 Chiyoda',
        address2: 'Marunouchi Building',
        countryValue: countryOptions[0]?.value,
        countryLabels: [countryOptions[0]?.text].filter(Boolean),
        stateValue: null,
        stateLabels: [],
        city: 'Tokyo',
        postalCode: '100-0001'
      };

    if (!address.countryValue) {
      throw new Error('No country options are available in the Edit Shipping Address modal.');
    }

    await this.setFieldValue(modal.locator('[name="attnName"]'), address.attentionName);
    await this.setFieldValue(modal.locator('[name="address1"]'), address.address1);
    await this.setFieldValue(modal.locator('[name="address2"]'), address.address2);
    await this.setFieldValue(countrySelect, address.countryValue, address.countryLabels);
    await this.selectStateProvince(modal, address);
    await this.setFieldValue(modal.locator('[name="city"]'), address.city);
    await this.setFieldValue(modal.locator('[name="postalCode"]'), address.postalCode);

    this.updatedShippingAddress = address;
  }

  async setFieldValue(field, value, labels = []) {
    const control = field.first();
    await control.waitFor({ state: 'visible', timeout: 10000 });
    const tagName = await control.evaluate(element => element.tagName.toLowerCase());

    if (tagName === 'select') {
      await this.selectOptionByValueOrLabel(control, value, labels);
      return;
    }

    await control.fill(value);
  }

  async getSelectOptions(select) {
    return select.locator('option').evaluateAll(optionElements => optionElements.map(option => ({
      value: option.value,
      text: (option.textContent || '').trim()
    })));
  }

  async selectStateProvince(modal, address) {
    const stateSelect = modal.locator('select[name="stateProvinceGeoId"]');
    const stateOptions = await this.getSelectOptions(stateSelect);

    if (address.stateValue && stateOptions.some(option => option.value === address.stateValue || address.stateLabels.includes(option.text))) {
      await this.setFieldValue(stateSelect, address.stateValue, address.stateLabels);
      return;
    }

    const fallbackState = stateOptions.find(option => option.value) || stateOptions[0];
    if (fallbackState?.value) {
      await this.setFieldValue(stateSelect, fallbackState.value, [fallbackState.text].filter(Boolean));
    }
  }

  async selectOptionByValueOrLabel(select, value, labels) {
    const options = await this.getSelectOptions(select);

    if (options.some(option => option.value === value)) {
      await select.selectOption(value);
      return;
    }

    for (const label of labels) {
      if (options.some(option => option.text === label)) {
        await select.selectOption({ label });
        return;
      }
    }

    throw new Error(`Option not found. Expected value "${value}" or labels: ${labels.join(', ')}. Available options: ${options.map(option => `${option.text}=${option.value}`).join(', ')}`);
  }

  async verifyKeepLatitudeLongitudeChecked() {
    const modal = this.editShippingAddressModal;
    await expect(modal.locator('input[name="keepLatitudeAndLongitude"][value="Y"]')).toBeChecked();
  }

  async saveShippingAddress() {
    console.log('Saving shipping address...');
    const modal = this.editShippingAddressModal;
    await modal.locator('button[type="submit"].btn-primary:has-text("Save")').click();
    await expect(modal).toBeHidden({ timeout: 15000 });
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.reload();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async verifyUpdatedShippingAddressDisplayed() {
    console.log('Verifying updated shipping address on order details page...');
    const pageBody = this.page.locator('body');
    const address = this.updatedShippingAddress;

    if (!address) {
      throw new Error('Updated shipping address data was not captured before verification.');
    }

    await expect(pageBody).toContainText(address.attentionName);
    await expect(pageBody).toContainText(address.address1);
    await expect(pageBody).toContainText(address.address2);
    await expect(pageBody).toContainText(address.city);
    await expect(pageBody).toContainText(address.postalCode);
  }

  async verifyCompletedOrderIsNotEditable() {
    console.log('Verifying completed order does not expose phone delete or shipping address edit actions...');
    await expect(this.deletePhoneNumberLink).toHaveCount(0);
    await expect(this.editShippingAddressLink).toHaveCount(0);

    const editShippingModal = this.editShippingAddressModal;
    await expect(editShippingModal).toHaveCount(0);
  }
}

module.exports = { EditOrderItemsGroupPage };
