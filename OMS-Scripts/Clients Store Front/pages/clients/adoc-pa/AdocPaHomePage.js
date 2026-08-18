const { BaseStorefrontHomePage } = require('../../shared/BaseStorefrontHomePage');

class AdocPaHomePage extends BaseStorefrontHomePage {
  async navigateToAccessories() {
    const accessoriesLink = this.page.locator('a[href="/collections/accesorios-1"]', { hasText: 'Accesorios' }).first()
      .or(this.page.locator('a', { hasText: /Accesorios/i }).first());
    
    await accessoriesLink.click({ force: true });
    await this.page.waitForLoadState('domcontentloaded');
  }

  async navigateToMens() {
    const mensLink = this.page.locator('a[href="/collections/hombre"]', { hasText: 'Hombre' }).first()
      .or(this.page.locator('a.Header__SecondaryNav', { hasText: /Hombre/i }).first())
      .or(this.page.locator('a', { hasText: /^Hombre$/i }).first());
    
    await mensLink.click({ force: true });
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { AdocPaHomePage };
