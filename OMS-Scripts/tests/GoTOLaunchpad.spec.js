const { test, expect } = require('../fixtures/fixtures');

test.describe('Session / Go to Launchpad Flow', () => {

  test('should click "Go to Launchpad" and verify new tab redirection and client URL', async ({ authenticatedPage, baseURL, clientId }) => {
    console.log(`\n=== Running Go to Launchpad Test for: ${clientId} ===`);

    // 1. Navigate to landing page
    const url = new URL(baseURL);
    await authenticatedPage.goto(`${url.origin}/commerce/control/main`);
    await authenticatedPage.waitForLoadState('networkidle');

    let sideMenu = authenticatedPage.locator('.side-menu').first();
    const isModern = await sideMenu.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isModern) {
      console.log(`[SKIP] Feature_Not_Supported: Modern OMS Commerce Console is not active for client ${clientId}.`);
      test.skip();
      return;
    }

    // 2. Open/reveal side menu
    console.log('Step 1: Revealing side menu...');
    await authenticatedPage.evaluate(() => {
      const sidebar = document.querySelector('.side-menu');
      if (sidebar) {
        sidebar.classList.remove('hidden-xs');
        sidebar.style.display = 'block';
      }
    });

    sideMenu = authenticatedPage.locator('.side-menu').first();
    await sideMenu.hover();
    await authenticatedPage.waitForTimeout(1500);

    // 3. Find and click "Go to Launchpad", capturing the new tab
    console.log('Step 2: Clicking "Go to Launchpad" and capturing new tab...');
    const launchpadLink = authenticatedPage.locator('.side-menu').getByText('Go to Launchpad').first();
    await expect(launchpadLink).toBeVisible({ timeout: 15000 });

    const context = authenticatedPage.context();
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      launchpadLink.click(),
    ]);

    // 4. Verify Launchpad redirection and client URL
    console.log('Step 3: Verifying Launchpad URL and client environment...');
    await newPage.waitForLoadState('networkidle');
    await expect(newPage).toHaveURL(/launchpad.hotwax.io\/home/);

    // Assert that the page displays the client identifier or client host URL
    console.log(`Step 4: Confirming client identifier "${clientId}" is displayed on Launchpad...`);
    await expect(newPage.locator('body')).toContainText(clientId);

    console.log('\n[SUCCESS] Redirection to Launchpad and client environment successfully verified!');
  });

});
