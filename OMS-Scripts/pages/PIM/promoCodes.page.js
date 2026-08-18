const { expect } = require('@playwright/test');

class PromoCodesPage {
  constructor(page, baseURL, clientId) {
    this.page = page;
    this.baseURL = baseURL;
    this.clientId = clientId;
  }

  /**
   * Navigate to Promo Codes screen via PIM sidebar menu
   */
  async navigateToPromoCodes() {
    console.log('Step 1: Navigating to Promo Codes page...');
    const url = new URL(this.baseURL);
    const targetUrl = `${url.origin}/commerce/control/FindPromoCode`;
    console.log(`   Direct navigation target: ${targetUrl}`);
    
    try {
      await this.page.goto(targetUrl, { timeout: 30000 });
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);

      const pageContent = await this.page.content().catch(() => '');
      if (pageContent.includes('Page not found!') || this.page.url().includes('error')) {
        throw new Error('Feature_Not_Supported: Modern OMS Commerce Console is not active for this client.');
      }
    } catch (e) {
      if (e.message.includes('Feature_Not_Supported')) {
        throw e;
      }
      console.warn(`   Direct URL navigation to ${targetUrl} failed: ${e.message}`);
    }

    // Fallback: If not on FindPromoCodes page or the side-menu exists, perform menu click
    const sideMenu = this.page.locator('.side-menu').first();
    if (await sideMenu.isVisible().catch(() => false)) {
      console.log('   Running OMS Commerce Console sidebar navigation fallback...');
      await this.page.evaluate(() => {
        const sidebar = document.querySelector('.side-menu');
        if (sidebar) {
          sidebar.classList.remove('hidden-xs');
          sidebar.style.display = 'block';
        }
      });
      await sideMenu.hover().catch(() => {});
      await this.page.waitForTimeout(1000);

      console.log('   Opening PIM parent menu...');
      await this.page.getByText('PIM').first().click();
      await this.page.waitForTimeout(1000);

      console.log('   Clicking Promo Codes child menu...');
      await this.page.getByText('Promo Codes').first().click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);

      await this.page.evaluate(() => {
        const sidebar = document.querySelector('.side-menu');
        if (sidebar) sidebar.style.display = 'none';
      });
    }
  }

  /**
   * Click Add and fill details in the modal
   */
  async addPromoCode(promoName) {
    console.log('Step 5: Clicking Add button to open the modal...');
    const addBtn = this.page.locator('button[title="Add Promo Code"], button:has-text("Add"), ion-fab-button, ion-button:has-text("Add")').first();
    
    try {
      await addBtn.waitFor({ state: 'visible', timeout: 8000 });
      await addBtn.click();
    } catch (e) {
      throw new Error(`[DATA ERROR] Cannot find 'Add Promo Code' button. Feature may not be supported or UI might be different. Original error: ${e.message}`);
    }
    await this.page.waitForTimeout(1000);

    console.log('Step 6: Verifying Add Promo Code modal is visible...');
    const modal = this.page.locator('.modal-dialog, .modal-content, ion-modal').filter({ hasText: /Add Promo Code|Add/i }).first();
    try {
      await expect(modal).toBeVisible({ timeout: 5000 });
    } catch (e) {
      throw new Error(`[DATA ERROR] Modal did not appear after clicking Add. Original error: ${e.message}`);
    }

    console.log(`Step 7: Filling Promo Name field with "${promoName}"...`);
    const promoInput = this.page.locator('input#promoName, input[name="promoName"], ion-input[name="promoName"] input').first();
    await promoInput.fill(promoName);

    console.log('Step 8: Submitting the Add form...');
    const submitBtn = modal.locator('button[type="submit"]:has-text("Add"), button.btn-primary:has-text("Add"), ion-button:has-text("Add")').first();
    await submitBtn.click();
    await this.page.waitForTimeout(2000);

    console.log('Step 9: Verifying promo code appears in the list...');
    const newPromoRow = this.page.locator('table tbody tr, ion-item', { hasText: promoName }).first();
    await expect(newPromoRow).toBeVisible({ timeout: 10000 });
    console.log('   Promo code creation successfully verified!');
  }

  /**
   * Find row by name, click delete, and confirm inside the confirmation modal
   */
  async deletePromoCode(promoName) {
    console.log(`Step 10: Locating row for Promo Code: "${promoName}"...`);
    const promoRow = this.page.locator('table tbody tr, ion-item', { hasText: promoName }).first();
    
    try {
      await expect(promoRow).toBeVisible({ timeout: 10000 });
    } catch (e) {
      throw new Error(`[DATA ERROR] Cannot find row for promo code "${promoName}". It might not have been created or list is empty. Original error: ${e.message}`);
    }

    console.log('Step 11: Clicking delete button inside the row...');
    const deleteBtn = promoRow.locator('button[title="Delete Promo Code"], .js-confirm-me, ion-button[color="danger"], ion-icon[name="trash"]').first();
    await deleteBtn.click();
    await this.page.waitForTimeout(1000);

    console.log('Step 12: Confirming deletion inside confirmation modal...');
    const confirmModal = this.page.locator('.modal-dialog, .modal-content, ion-alert').filter({ hasText: /Delete|Confirm/i }).last();
    if (await confirmModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      const confirmBtn = confirmModal.locator('button, a, .alert-button').filter({ hasText: /^Yes$|^Delete$|^Confirm$/i }).first();
      await confirmBtn.click();
    }

    console.log('Step 13: Verifying promo code is removed from the list...');
    const deletedPromoRow = this.page.locator('table tbody tr, ion-item', { hasText: promoName }).first();
    await expect(deletedPromoRow).toBeHidden({ timeout: 10000 });
    console.log('   Promo code deletion successfully verified!');
    await this.page.waitForTimeout(3000);
  }
}

module.exports = { PromoCodesPage };
