const { expect } = require('@playwright/test');

class ThirdLoveHomePage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    // Known URL for ThirdLove UAT
    this.url = 'https://thirdlove-uat.myshopify.com/';
  }

  async verifyHomepageLoaded(expectedTitle = 'ThirdLove UAT') {
    await this.page.goto(this.url);
    await expect(this.page).toHaveTitle(new RegExp(expectedTitle, 'i'));
    console.log('ThirdLove Homepage loaded successfully.');
  }

  async navigateToCategory(category = 'all') {
    // Navigating directly to avoid top nav links that may route to PROD (trythirdlove.com)
    console.log(`Navigating directly to category: collections/${category}`);
    await this.page.goto(`${this.url}collections/${category}`);
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { ThirdLoveHomePage };
