/**
 * Page Object Model for the Launchpad Login flow.
 * Handles OMS authentication across environments.
 */
import { Page } from '@playwright/test';

export class LoginPage {
  page: Page;
  usernameInput: any;
  passwordInput: any;
  loginBtn: any;

  constructor(page: Page) {
    this.page = page;
    // prefer role-based locators; fall back to input selectors when necessary
    this.usernameInput = page.getByRole('textbox').first();
    this.passwordInput = (page.getByRole('textbox').nth(1) as any) || page.locator('input[type="password"]');
    this.loginBtn = page.getByRole('button', { name: 'Login' });
  }

  async goto() {
    const loginUrl = process.env.PLAYWRIGHT_OMS_URL || 'https://launchpad-dev.hotwax.io/login?isLoggedOut=true&redirectUrl=https://transfers-dev.hotwax.io/login';
    await this.page.goto(loginUrl);
    // wait for login button or username to appear
    await this.page.getByRole('button', { name: /login/i }).waitFor({ timeout: 10000 }).catch(() => {});
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
      this.loginBtn.click(),
    ]);
  }
}
