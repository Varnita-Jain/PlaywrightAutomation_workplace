const { BaseStorefrontHomePage } = require('../../shared/BaseStorefrontHomePage');

class AdocCrHomePage extends BaseStorefrontHomePage {
  getCategoryTab(categoryName) {
    // Specifically targets the tabs menu label as per example HTML
    // <li class="tabs-menu-label"><span>Womens</span></li>
    return this.page.locator('li.tabs-menu-label').filter({ hasText: categoryName });
  }
}

module.exports = { AdocCrHomePage };
