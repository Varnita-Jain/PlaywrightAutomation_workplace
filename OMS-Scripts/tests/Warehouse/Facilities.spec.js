const { test, expect } = require('../../fixtures/fixtures');
const { FacilitiesPage } = require('../../pages/Warehouse/facilities.page');

test.describe('Warehouse / Facilities Flow', () => {

  test('should navigate to Facilities page successfully', async ({ authenticatedPage, baseURL, clientId }) => {
    console.log(`\n=== Running Facilities Test for: ${clientId} ===`);

    const facilitiesPage = new FacilitiesPage(authenticatedPage, baseURL, clientId);
    
    // 1. Navigate to Facilities
    await facilitiesPage.navigateToFacilities();

    // 2. Verify page opened
    await facilitiesPage.verifyFacilitiesPageOpened();
  });

});
