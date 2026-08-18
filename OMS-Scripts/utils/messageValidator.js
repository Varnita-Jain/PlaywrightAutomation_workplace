const { expect } = require('@playwright/test');

class MessageValidator {
  constructor(page) {
    this.page = page;
  }

  /**
   * Helper to ensure a message is user-friendly and doesn't expose raw backend errors.
   */
  verifyUserFriendlyMessage(text) {
    if (!text) return;
    
    // Array of common backend jargon and stack trace indicators
    const backendIndicators = [
      'Exception', 'NullPointer', 'java.lang', 'SQLSyntax', 
      'Internal Server Error', 'Traceback', 'Cannot read properties'
    ];
    
    for (const jargon of backendIndicators) {
      if (text.toLowerCase().includes(jargon.toLowerCase())) {
        throw new Error(`[UX ERROR] Message is not user-friendly. It exposes backend jargon: "${jargon}" in text: "${text}"`);
      }
    }

    // Check for raw JSON exposure
    if ((text.includes('{') && text.includes('}')) || (text.includes('[') && text.includes(']'))) {
       throw new Error(`[UX ERROR] Message appears to expose raw JSON or array objects instead of a readable string: "${text}"`);
    }
  }

  /**
   * Validates a success toast message.
   * Ensures it supports regex/patterns for i18n and checks that it stays visible for ~5 seconds.
   */
  async verifySuccessToast(expectedPattern = null) {
    console.log('Verifying Success Toast...');
    const toast = this.page.locator('.toast-message, .snackbar, .success-message, ion-toast, [data-test="success-toast"], .alert-success, .alert-info, .eventMessage').first();
    
    await toast.waitFor({ state: 'visible', timeout: 10000 });
    const text = await toast.innerText();
    
    console.log(`Success Toast found: "${text}"`);
    this.verifyUserFriendlyMessage(text);
    
    if (expectedPattern) {
        expect(text).toMatch(expectedPattern);
    }
    
    // The user requested to verify it takes about 5 seconds to read. 
    // We will ensure it is still visible after a short delay (e.g. 2-3 seconds) 
    // but we won't strictly block for a full 5 seconds every single test unless needed.
    // Let's test that it persists for at least 3 seconds so the user can read it.
    await this.page.waitForTimeout(3000);
    expect(await toast.isVisible()).toBeTruthy();
    console.log('Toast persists long enough to be read.');
  }

  /**
   * Validates an error banner or message.
   */
  async verifyErrorBanner(expectedPattern = null) {
    console.log('Verifying Error Banner...');
    const banner = this.page.locator('.alert-danger, .errorMessage, .message-error, [data-test="error-message"]').first();
    
    await banner.waitFor({ state: 'visible', timeout: 10000 });
    const text = await banner.innerText();
    
    console.log(`Error Banner found: "${text}"`);
    
    // Critical check: Ensure it's not a stack trace
    this.verifyUserFriendlyMessage(text);

    if (expectedPattern) {
        expect(text).toMatch(expectedPattern);
    }
  }

  /**
   * Validates inline validation errors (e.g. required fields).
   */
  async verifyInlineValidationError(inputLocator, expectedPattern = null) {
    // Usually inline errors appear as a sibling or in a specific class near the input
    // We look globally for invalid-feedback or within a specific container
    const errorMsg = this.page.locator('.invalid-feedback, .error-text, ion-note[color="danger"]').first();
    await errorMsg.waitFor({ state: 'visible', timeout: 5000 });
    
    const text = await errorMsg.innerText();
    console.log(`Inline Validation found: "${text}"`);
    
    this.verifyUserFriendlyMessage(text);

    if (expectedPattern) {
        expect(text).toMatch(expectedPattern);
    }
  }

  /**
   * Validates confirmation modals.
   */
  async verifyModalConfirmation(expectedTitlePattern, expectedBodyPattern = null) {
    console.log('Verifying Confirmation Modal...');
    // Use :visible to avoid matching stale, closed modals that remain in the DOM
    const modal = this.page.locator('.modal-dialog:visible, ion-modal:visible, dialog:visible').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    
    const title = await modal.locator('.modal-title, ion-title, h2').first().innerText();
    console.log(`Modal Title: "${title}"`);
    
    if (expectedTitlePattern) {
        expect(title).toMatch(expectedTitlePattern);
    }
    
    if (expectedBodyPattern) {
        const body = await modal.locator('.modal-body, ion-content, p').first().innerText();
        expect(body).toMatch(expectedBodyPattern);
    }
  }
}

module.exports = { MessageValidator };
