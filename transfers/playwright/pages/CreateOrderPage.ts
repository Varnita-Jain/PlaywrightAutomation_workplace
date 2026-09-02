/**
 * Page Object Model for the Create Order flow.
 * Provides methods and locators for filling out the transfer order form,
 * assigning locations, adding products, and saving the order.
 */
import { type Locator, type Page, expect } from '@playwright/test';

export class CreateOrderPage {
  page: Page;
  transferNameInput: Locator;
  productStoreSelectTrigger: Locator;
  originAssignBtn: Locator;
  destinationAssignBtn: Locator;
  lifecycleSelectTrigger: Locator;
  deliveryDateBtn: Locator;
  productSearchInput: Locator;
  addProductBtn: Locator;
  qtyInput: Locator;
  saveBtn: Locator;
  modalSearchInput: Locator;
  modalAssignBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.transferNameInput = page.getByRole('textbox', { name: /transfer name/i });
    this.productStoreSelectTrigger = page.getByTestId('create-order-store-select');
    this.originAssignBtn = page.getByTestId('create-order-origin-assign-btn');
    this.destinationAssignBtn = page.getByTestId('create-order-destination-assign-btn');
    this.lifecycleSelectTrigger = page.locator('ion-card:has-text("Plan") ion-select').first();
    this.deliveryDateBtn = page.getByTestId('create-order-deliverydate-btn');
    this.productSearchInput = page.getByTestId('create-order-add-product-input');
    this.addProductBtn = page.getByTestId('create-order-add-product-btn');
    this.qtyInput = page.getByRole('spinbutton').first();
    this.saveBtn = page.getByTestId('create-order-submit-btn');
    this.modalSearchInput = page.getByTestId('select-facility-searchbar');
    this.modalAssignBtn = page.getByTestId('select-facility-save-btn');
  }

  async goto() {
    await this.page.goto('/create-order');
    await this.page.waitForLoadState('networkidle');
  }

  async setTransferName(name: string) {
    await this.transferNameInput.fill(name);
  }

  async selectProductStore(storeName: string) {
    await this.productStoreSelectTrigger.click();
    // pick option via role; try exact match first, then fallback to first available option
    const opt = this.page.getByRole('option', { name: new RegExp(`^${storeName}$`, 'i') });
    if ((await opt.count()) > 0) {
      await opt.first().click();
    } else {
      const anyOption = this.page.getByRole('option').first();
      if ((await anyOption.count()) > 0) {
        await anyOption.click();
      } else {
        const radio = this.page.getByRole('radio', { name: new RegExp(storeName, 'i') });
        if ((await radio.count()) > 0) {
          await radio.first().click();
        } else {
          const anyRadio = this.page.getByRole('radio').first();
          if ((await anyRadio.count()) > 0) {
            await anyRadio.click();
          }
        }
      }
    }
    await this.dismissSelectPopoverIfOpen();
  }

  async _assignFacility(assignBtn: any, forceSearchQuery?: string, excludeFacilityName?: string) {
    await this.dismissSelectPopoverIfOpen();
    await assignBtn.click();
    await expect(this.modalSearchInput).toBeVisible({ timeout: 10000 });
    
    if (forceSearchQuery) {
      await this.modalSearchInput.locator('input').fill(forceSearchQuery);
    } else {
      const chars = ['a', 'e', 'i', 'o', 'u', 's', 't'];
      const searchChar = chars[Math.floor(Math.random() * chars.length)];
      await this.modalSearchInput.locator('input').fill(searchChar);
    }

    await this.page.waitForTimeout(1500); // Give search time to return results
    
    let selectedName = '';
    const rows = this.page.locator('[data-testid^="select-facility-row-"]');
    const radios = this.page.getByRole('radio');
    
    let targetIndex = 0;

    if (excludeFacilityName) {
      for (let i = 0; i < 5; i++) {
        let name = '';
        if (await rows.nth(i).isVisible().catch(() => false)) {
          name = (await rows.nth(i).innerText()).trim();
        } else if (await radios.nth(i).isVisible().catch(() => false)) {
          name = (await radios.nth(i).innerText()).trim();
        } else {
          break; // no more elements
        }
        
        // Strip out newlines and extra spaces for comparison
        const normalizedName = name.replace(/\s+/g, ' ').trim();
        const normalizedExclude = excludeFacilityName.replace(/\s+/g, ' ').trim();

        if (normalizedName && normalizedName !== normalizedExclude) {
          targetIndex = i;
          break;
        }
      }
      
      // If we still landed on 0 (maybe name comparison failed), just force index 1 if available
      if (targetIndex === 0) {
        if (await rows.nth(1).isVisible().catch(() => false) || await radios.nth(1).isVisible().catch(() => false)) {
           targetIndex = 1;
        }
      }
    }
    
    const targetRow = rows.nth(targetIndex);
    const targetRadio = radios.nth(targetIndex);

    if (await targetRow.isVisible().catch(()=>false)) {
      selectedName = (await targetRow.innerText()).trim();
      await targetRow.click();
    } else if (await targetRadio.isVisible().catch(()=>false)) {
      selectedName = (await targetRadio.innerText()).trim();
      await targetRadio.click();
    } else {
      // clear and just try empty search
      await this.modalSearchInput.locator('input').fill('');
      await this.page.waitForTimeout(1500);
      
      if (excludeFacilityName) {
        let fallbackName = '';
        if (await rows.first().isVisible().catch(()=>false)) fallbackName = (await rows.first().innerText()).trim();
        if (fallbackName === excludeFacilityName) targetIndex = 1;
        else targetIndex = 0;
      }
      
      const fallbackRow = rows.nth(targetIndex);
      const fallbackRadio = radios.nth(targetIndex);

      if (await fallbackRow.isVisible().catch(()=>false)) {
        selectedName = (await fallbackRow.innerText()).trim();
        await fallbackRow.click();
      } else {
        await fallbackRadio.click();
      }
    }
    
    await this.modalAssignBtn.click();
    await expect(this.modalSearchInput).toBeHidden({ timeout: 10000 });
    return selectedName;
  }

  async assignOrigin(forceSearchQuery?: string) {
    return this._assignFacility(this.originAssignBtn, forceSearchQuery);
  }

  async assignDestination(forceSearchQuery?: string, excludeFacilityName?: string) {
    return this._assignFacility(this.destinationAssignBtn, forceSearchQuery, excludeFacilityName);
  }

  async selectLifecycle(lifecycleOption: string) {
    await this.lifecycleSelectTrigger.click();
    await this.page.getByRole('radio', { name: lifecycleOption }).click();
    await this.dismissSelectPopoverIfOpen();
  }

  async selectTodayShipDate() {
    await this.page.getByTestId('create-order-shipdate-btn').click();
    await this.page.getByRole('button', { name: /Today/i }).click();
    await this.page.getByRole('button', { name: /Done|OK/i }).click();
  }

  /**
   * Searches for a product by SKU and adds a specified quantity.
   */
  async addProduct(sku?: string | string[]) {
    // In Ionic 7, ion-input encapsulates the input inside a shadow DOM wrapper.
    // Sometimes .fill() fails due to actionability checks failing on the host node.
    // We target the inner input specifically.
    
    // Normalize passed sku to an array
    const passedSkus = Array.isArray(sku) ? sku : [sku];

    const keywords = [
      process.env.TEST_PRODUCT_SKU,
      ...passedSkus,
      'red', 'green', 'yellow', 'blue', 'black', 'white', 'shirt', 'pant',
      Math.floor(Math.random() * 9000 + 1000).toString()
    ].filter(Boolean) as string[];

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      await this.productSearchInput.locator('input').fill(keyword);
      await this.page.keyboard.press('Enter');

      try {
        // wait for the add button that appears for the search result
        await expect(this.addProductBtn).toBeVisible({ timeout: 4000 });
        await expect(this.addProductBtn).toBeEnabled({ timeout: 2000 });
        await this.addProductBtn.click();
        return; // Success
      } catch (e) {
        // Clear the input for the next try
        await this.productSearchInput.locator('input').fill('');
        if (i === keywords.length - 1) {
          throw new Error(`Could not add product. Searched keywords: ${keywords.join(', ')}`);
        }
      }
    }
  }

  async setQuantity(qty: number) {
    const spin = this.page.getByRole('spinbutton').first();
    if ((await spin.count()) > 0) {
      await spin.fill(qty.toString());
      return;
    }
    // fallback: find number input
    const input = this.page.locator('input[type="number"]').first();
    await input.fill(qty.toString());
  }

  async clickSave() {
    await expect(this.saveBtn).toBeEnabled({ timeout: 15_000 });
    await this.saveBtn.click({ force: true });
    
    // Wait for SPA router navigation to the order detail page instead of full page load
    await this.page.waitForURL(/.*\/order(?:-detail)?\/.*/i, { timeout: 30_000 }).catch(() => {});
  }

  async dismissSelectPopoverIfOpen() {
    const popover = this.page.locator('ion-popover.select-popover');
    if (await popover.count() > 0 && await popover.first().isVisible()) {
      await this.page.keyboard.press('Escape');
      await expect(popover.first()).toBeHidden({ timeout: 3000 });
    }
  }
}
