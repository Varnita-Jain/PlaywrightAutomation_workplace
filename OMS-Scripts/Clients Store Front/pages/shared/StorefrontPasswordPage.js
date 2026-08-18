const { expect } = require('@playwright/test');

class StorefrontPasswordPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {Object} config Client configuration object
   */
  constructor(page, config) {
    this.page = page;
    this.config = config;

    // Locators
    this.passwordInput = page.locator('input[type="password"][name="password"]');
    this.enterButton = page.getByRole('button', { name: /enter/i }).or(page.locator('button[type="submit"]'));
  }

  /**
   * Navigates to the password page, verifies the storefront heading,
   * submits the password, and waits for the storefront to unlock.
   * 
   * @param {string} expectedHeadingText The text of the heading to verify on the password page
   */
  async unlockStorefront(expectedHeadingText) {
    const url = this.config.shopify?.storefrontUrl;
    const password = this.config.shopify?.storefrontPassword;

    if (!url || !password) {
      throw new Error(`[CONFIG ERROR] Storefront URL or Password missing in .env for client: ${this.config.clientId}`);
    }

    // 1. Navigate to the storefront password page
    await this.page.goto(url);

    // 2. Verify that the page has loaded correctly by checking the heading
    if (expectedHeadingText) {
      const heading = this.page.getByRole('heading', { name: expectedHeadingText });
      await expect(heading).toBeVisible();
    }

    // 3. Wait for the password input field to become visible and enter the password
    await this.passwordInput.waitFor({ state: 'visible' });
    await this.passwordInput.fill(password);

    // 4. Submit the password and wait for navigation away from the password page
    await Promise.all([
      this.page.waitForURL(url => !url.href.includes('password'), { timeout: 20000 }),
      this.passwordInput.press('Enter')
    ]);

    // 5. Wait until the storefront home page has loaded successfully
    await this.page.waitForLoadState('domcontentloaded');
    expect(this.page.url()).toContain('shopify');
  }
}

module.exports = { StorefrontPasswordPage };
