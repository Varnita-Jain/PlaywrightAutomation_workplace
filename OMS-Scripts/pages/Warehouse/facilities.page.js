const { expect } = require('@playwright/test');

class FacilitiesPage {
  constructor(page, baseURL, clientId) {
    this.page = page;
    this.baseURL = baseURL;
    this.clientId = clientId;
  }
  
  /**
   * Navigate to the landing page, expand side menu, expand "Warehouse", and select "Facilities"
   */
  async navigateToFacilities() {
    // Navigate to landing page
    const url = new URL(this.baseURL);
    await this.page.goto(`${url.origin}/commerce/control/main`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);

    // Open/reveal side menu
    console.log('Step 1: Revealing side menu...');
    await this.page.evaluate(() => {
      const sidebar = document.querySelector('.side-menu');
      if (sidebar) {
        sidebar.classList.remove('hidden-xs');
        sidebar.style.display = 'block';
      }
    });

    const sideMenu = this.page.locator('.side-menu').first();
    if (await sideMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sideMenu.hover().catch(() => {});
      console.log('Hovered side menu, waiting for expansion...');
      await this.page.waitForTimeout(1500); // Wait for slide-out animation
    }

    // Click "Warehouse" option to expand it
    console.log('Step 2: Clicking "Warehouse" parent menu option...');
    await this.page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.side-menu *'));
      const warehouseEl = elements.find(el => el.textContent.trim() === 'Warehouse' && el.children.length === 0);
      if (warehouseEl) {
        const clickable = warehouseEl.closest('[class*="item"], li, div') || warehouseEl.parentElement;
        if (clickable) clickable.click();
      }
    });
    await this.page.waitForTimeout(2000); // Wait for collapse/expand transition

    // Click "Facilities" option under Warehouse menu
    console.log('Step 3: Clicking "Facilities" child menu option...');
    await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.side-menu a'));
      const targetLink = links.find(link => link.textContent.includes('Facilities') || link.href.includes('FindFacility'));
      if (targetLink) {
        targetLink.click();
      } else {
        const elements = Array.from(document.querySelectorAll('.side-menu *'));
        const fallback = elements.find(el => el.textContent.includes('Facilities'));
        if (fallback) fallback.click();
      }
    });

    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(3000);
  }

  /**
   * Verify that the Facilities page opened successfully
   */
  async verifyFacilitiesPageOpened() {
    console.log('Step 4: Verifying the Facilities page opened...');
    // Look for search input or heading that is unique to the Facilities list
    const searchField = this.page.locator('input[name="facilityId"], input[name="facilityName"], input[placeholder*="Facility"]').first();
    const findBtn = this.page.locator('button[type="submit"], button:has-text("Find"), button:has-text("Search")').first();
    
    // We should expect either a search input or heading to be visible
    const isSearchVisible = await searchField.isVisible({ timeout: 15000 }).catch(() => false);
    const isBtnVisible = await findBtn.isVisible({ timeout: 15000 }).catch(() => false);
    
    expect(isSearchVisible || isBtnVisible).toBe(true);
    console.log('[SUCCESS] Facilities page verified and open!');
  }
}

module.exports = { FacilitiesPage };
