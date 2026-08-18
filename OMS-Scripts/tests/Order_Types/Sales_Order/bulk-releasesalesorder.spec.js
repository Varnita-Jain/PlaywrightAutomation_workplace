const { test, expect } = require('../../../fixtures/fixtures');
const { FiltersOMSPage } = require('../../../pages/Order_Types/Sales_Order/filters.page');
const { ReleaseSalesOrderOMSPage } = require('../../../pages/Order_Types/Sales_Order/releasesalesorder.page');
const fs = require('fs');
const path = require('path');

test.describe('Bulk Release Sales Orders from Report', () => {

  // Helper for universal search
  async function performUniversalSearch(page, query) {
      const searchInput = page.getByRole('textbox').first();
      await searchInput.waitFor({ state: 'visible', timeout: 10000 });
      await searchInput.fill(query);
      
      const searchBtn = page.getByRole('button', { name: 'Search' }).first();
      if (await searchBtn.isVisible()) {
          await searchBtn.click();
      } else {
          await searchInput.press('Enter');
      }
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000); 
  }

  // Parse the report to find order references
  const reportPath = path.join(process.cwd(), '..', 'Shopify Bulk Order', 'bulk-orders-report.md');
  let orderReferences = [];

  if (fs.existsSync(reportPath)) {
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    // Regex to match: **Imported to OMS:** Reference `OMS-AUTO-mephisto-testing-1781850574511`
    const regex = /\*\*Imported to OMS:\*\* Reference \`([A-Za-z0-9\-]+)\`/g;
    let match;
    while ((match = regex.exec(reportContent)) !== null) {
      orderReferences.push(match[1]);
    }
  }

  if (orderReferences.length === 0) {
    test('No orders found in report', () => {
      console.log(`No order references found in ${reportPath}. Ensure the Shopify bulk creation script was run.`);
      test.skip();
    });
    return;
  }

  // Iterate and create a test case for each order reference
  for (const reference of orderReferences) {
    test(`Release Order: ${reference}`, async ({ authenticatedPage, baseURL, clientId }) => {
      // Set test timeout to 25 minutes to accommodate the 15-minute sync job interval
      test.setTimeout(25 * 60 * 1000); 
      
      const searchPage = new FiltersOMSPage(authenticatedPage, baseURL, clientId);
      const releasePage = new ReleaseSalesOrderOMSPage(authenticatedPage, baseURL, clientId);

      console.log(`\n[START] Processing Order Reference: ${reference}`);

      // 1. Navigate to Find Orders
      await searchPage.navigateToFindOrder();

      // 2. Poll for the External Reference (Wait up to 20 minutes for import)
      let hasResults = false;
      const maxRetries = 20; // 20 minutes (checking once per minute)
      let attempt = 0;

      while (!hasResults && attempt < maxRetries) {
          attempt++;
          console.log(`Searching for ${reference}... (Attempt ${attempt}/${maxRetries})`);
          await performUniversalSearch(authenticatedPage, reference);
          hasResults = await searchPage.resultsFound();
          
          if (!hasResults) {
              console.log(`Order ${reference} not yet imported. Waiting 60 seconds...`);
              await authenticatedPage.waitForTimeout(60000);
          }
      }

      if (!hasResults) {
        throw new Error(`Order reference ${reference} not found in OMS after 20 minutes. Please check the import jobs.`);
      }

      // 3. Click into the order
      await authenticatedPage.waitForLoadState('networkidle');

      // 4. Check status and Approve if necessary
      const statusLocator = releasePage.page.locator('.definition, .value, dd, ion-note, ion-label:has-text("Status") + ion-note, dt:has-text("Status") + dd').filter({ hasText: /Cancelled|Created|Approved|Completed/i }).first();
      let currentStatus = await statusLocator.innerText().catch(() => '');
      console.log(`Current status for ${reference}: "${currentStatus}"`);

      if (currentStatus.includes('Created')) {
          console.log('Order is in Created state. Approving...');
          await releasePage.approveOrder();
          
          currentStatus = await statusLocator.innerText().catch(() => '');
          if (currentStatus.includes('Completed')) {
            console.log('[SKIP] Order auto-completed upon approval.');
            return; // Order completed, move to next
          }
      } else if (currentStatus.includes('Completed') || currentStatus.includes('Cancelled')) {
          console.log(`[SKIP] Order is already ${currentStatus.trim()}. Cannot release.`);
          return;
      }

      // 5. Release the order
      const targetFacility = process.env.FACILITY || '';
      console.log(`Releasing order: ${reference} (Target Facility: ${targetFacility || 'Any'})...`);
      const selectedFacility = await releasePage.clickReleaseItemAndSaveFacility(targetFacility);
      
      if (selectedFacility) {
          console.log(`[SUCCESS] Order ${reference} released to facility: ${selectedFacility}`);
      } else {
          console.log(`[SUCCESS] Order ${reference} release action triggered.`);
      }
    });
  }
});
