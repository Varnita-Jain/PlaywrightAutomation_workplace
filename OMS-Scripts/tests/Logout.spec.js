const { test, expect } = require('../fixtures/fixtures');

test.describe('Session / Logout Flow', () => {
  
  test('should verify logout confirmation modal and cancel/confirm actions', async ({ authenticatedPage, baseURL, clientId, messageValidator }) => {
    console.log(`\n=== Running Logout Flow Test for: ${clientId} ===`);

    // 1. Navigate to landing page
    const url = new URL(baseURL);
    await authenticatedPage.goto(`${url.origin}/commerce/control/main`);
    await authenticatedPage.waitForLoadState('networkidle');
    await authenticatedPage.waitForTimeout(3000); // Wait for scripts to initialize

    // 2. Open/reveal side menu
    console.log('Step 1: Revealing side menu...');
    await authenticatedPage.evaluate(() => {
      const sidebar = document.querySelector('.side-menu');
      if (sidebar) {
        sidebar.classList.remove('hidden-xs');
        sidebar.style.display = 'block';
      }
    });

    const sideMenu = authenticatedPage.locator('.side-menu').first();
    if (await sideMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sideMenu.hover().catch(() => {});
      console.log('Hovered side menu, waiting for expansion...');
      await authenticatedPage.waitForTimeout(1500); // Wait for slide-out animation
    }

    // 3. Find and click "Logout" option
    console.log('Step 2: Clicking "Logout" parent menu option...');
    const logoutLink = authenticatedPage.locator('.side-menu a.js-confirm-me').filter({ hasText: /Logout/i }).first();
    await expect(logoutLink).toBeVisible({ timeout: 15000 });
    await logoutLink.scrollIntoViewIfNeeded();
    await logoutLink.click().catch(async () => {
      console.log('   Standard click failed, attempting native evaluate click...');
      await logoutLink.evaluate(el => el.click());
    });
    await authenticatedPage.waitForTimeout(1500);

    // 4. Verify confirmation modal is opened and check the text
    console.log('Step 3: Checking if confirmation modal is visible...');
    await messageValidator.verifyModalConfirmation(/Logout|Confirm|Are you sure/i, /Are you sure/i);
    const confirmModal = authenticatedPage.locator('.modal-dialog:visible, .modal-content:visible').filter({ hasText: /Are you sure/i }).first();

    // 5. Test "No" (Cancel) button action
    console.log('Step 4: Clicking "No" button inside the modal...');
    const noButton = confirmModal.locator('button, a').filter({ hasText: /^No$/i }).first();
    await expect(noButton).toBeVisible({ timeout: 5000 });
    await noButton.click();
    await authenticatedPage.waitForTimeout(1500);

    // Assert modal closed and user is still logged in
    console.log('   Asserting modal closed and user remains logged in...');
    await expect(confirmModal).toBeHidden({ timeout: 10000 });
    await expect(logoutLink).toBeVisible({ timeout: 10000 });
    console.log('   Success: User remains logged in after clicking "No".');

    // 6. Click Logout again to test "Yes" (Confirm) button action
    console.log('Step 5: Clicking "Logout" again to test Yes flow...');
    
    // Re-reveal side menu in case dismissing the modal closed it
    await authenticatedPage.evaluate(() => {
      const sidebar = document.querySelector('.side-menu');
      if (sidebar) {
        sidebar.classList.remove('hidden-xs');
        sidebar.style.display = 'block';
      }
    });
    if (await sideMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sideMenu.hover().catch(() => {});
      await authenticatedPage.waitForTimeout(1500);
    }

    await logoutLink.scrollIntoViewIfNeeded();
    await logoutLink.click().catch(async () => {
      console.log('   Standard click failed, attempting native evaluate click...');
      await logoutLink.evaluate(el => el.click());
    });
    await messageValidator.verifyModalConfirmation(/Logout|Confirm|Are you sure/i, /Are you sure/i);

    // Click "Yes" button inside the modal
    console.log('Step 6: Clicking "Yes" button inside the modal to confirm logout...');
    const yesButton = confirmModal.locator('button, a').filter({ hasText: /^Yes$/i }).first();
    await expect(yesButton).toBeVisible({ timeout: 5000 });
    await yesButton.click();
    
    // 7. Verify session is terminated and redirected to login page
    console.log('Step 7: Verifying redirection to Login page...');
    await authenticatedPage.waitForLoadState('networkidle').catch(() => {});
    await authenticatedPage.waitForTimeout(3000);

    const currentUrl = authenticatedPage.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Check if redirect contains login/checkLogin patterns or username field is visible
    const isLoginPage = currentUrl.includes('login') || currentUrl.includes('checkLogin');
    const isUsernameFieldVisible = await authenticatedPage.locator('input[name="USERNAME"], input[placeholder*="Username"], input[type="password"]').first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(isLoginPage || isUsernameFieldVisible).toBe(true);
    console.log('\n[SUCCESS] Session terminated and user logged out successfully!');
  });

});

