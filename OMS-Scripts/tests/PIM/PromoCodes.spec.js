const { test, expect } = require('../../fixtures/fixtures');
const { PromoCodesPage } = require('../../pages/PIM/promoCodes.page');

test.describe('PIM / Promo Codes Flow', () => {

  test('should navigate to Promo Codes, add "Winter Offer", and verify deletion', async ({ authenticatedPage, baseURL, clientId }) => {
    console.log(`\n=== Running Promo Codes Test for: ${clientId} ===`);

    const promoCodesPage = new PromoCodesPage(authenticatedPage, baseURL, clientId);
    
    // 1. Navigate to Promo Codes screen via PIM sidebar menu
    try {
      await promoCodesPage.navigateToPromoCodes();
    } catch (error) {
      if (error.message.includes('Feature_Not_Supported')) {
        console.log(`\n[SKIP] Feature not supported: Modern OMS Commerce Console is not active for ${clientId}. Gracefully skipping test...`);
        test.skip(true, 'Modern OMS Commerce Console is not active for this client');
        return;
      }
      throw error;
    }

    // 2. Add Promo Code "Winter Offer" and verify success toast
    try {
      await promoCodesPage.addPromoCode('Winter Offer');
    } catch (e) {
      if (e.message.includes('[DATA ERROR]')) {
        console.log(`\n[SKIP] ${e.message}`);
        test.skip(true, e.message);
        return;
      }
      throw e;
    }

    // 3. Delete "Winter Offer" and verify deletion success message
    try {
      await promoCodesPage.deletePromoCode('Winter Offer');
    } catch (e) {
      if (e.message.includes('[DATA ERROR]')) {
        console.log(`\n[SKIP] ${e.message}`);
        test.skip(true, e.message);
        return;
      }
      throw e;
    }
  });

});
