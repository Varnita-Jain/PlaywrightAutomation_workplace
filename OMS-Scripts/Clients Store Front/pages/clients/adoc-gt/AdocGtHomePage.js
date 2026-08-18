class AdocGtHomePage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  getMensCategory() {
    return this.page.locator('.nav-item-link-title', { hasText: 'Hombre' })
        .or(this.page.locator('a[href="/collections/hombres"]')).first();
  }

  async navigateToMens() {
    const categoryLink = this.getMensCategory();
    await categoryLink.waitFor({ state: 'visible', timeout: 30000 });
    await categoryLink.click();
    await this.page.waitForLoadState('networkidle');
  }
}

module.exports = { AdocGtHomePage };
