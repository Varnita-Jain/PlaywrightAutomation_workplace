const { expect } = require('@playwright/test');

class BaseStorefrontHomePage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  getLogo(logoText) {
    return this.page.getByRole('heading', { name: logoText, exact: false }).or(this.page.getByAltText(logoText, { exact: false }));
  }

  getCategoryTab(categoryName) {
    return this.page.getByRole('listitem').filter({ hasText: categoryName });
  }

  async verifyHomepageLoaded(logoText) {
    const logo = this.getLogo(logoText);
    await expect(logo.first()).toBeVisible();
    expect(this.page.url()).toContain('shopify');
  }

  async navigateToCategory(categoryName) {
    const tab = this.getCategoryTab(categoryName);
    await expect(tab).toBeVisible();
    await tab.click();
    await this.page.waitForLoadState('domcontentloaded'); // Wait for transition
    expect(this.page.url()).toContain('shopify');
  }
}

module.exports = { BaseStorefrontHomePage };
