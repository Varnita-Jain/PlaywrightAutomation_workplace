const { test, expect } = require('../../fixtures/fixtures');
const { CreateSalesReturnPage } = require('../../pages/Order_Types/Return_Order/createsalesreturn.page');

/**
 * Related Flow: Business Logic & Data Integrity
 * 
 * This suite contains negative test scenarios for ensuring the application enforces
 * strict business rules, such as preventing users from returning/refunding quantities
 * that exceed the originally shipped amounts.
 */
test.describe('Business Logic Violations - Negative Coverage', () => {
  test.setTimeout(90000);

  test('Should strictly prevent Over-Refunding / Over-Returning a line item', async ({ authenticatedPage, baseURL, clientId, messageValidator }) => {
    const createSalesReturnPage = new CreateSalesReturnPage(authenticatedPage, baseURL, clientId);
    
    try {
        console.log('Step 1: Navigating to Create Sales Return module...');
        await createSalesReturnPage.navigateToOrderManagementMenu();
        await createSalesReturnPage.selectCreateSalesReturnOption();
        await createSalesReturnPage.verifyCreateSalesReturnPageOpened();

        console.log('Step 2: Finding an eligible order for return...');
        await createSalesReturnPage.selectProductStore();
        await createSalesReturnPage.selectOrderDateMoreThan30Days();
        const filterResult = await createSalesReturnPage.verifyFilterApplied();

        if (!filterResult.hasTable) {
            test.skip(true, 'No records found with applied filters - skipping over-refund test');
            return;
        }

        console.log('Step 3: Initiating return flow for the first eligible order...');
        await createSalesReturnPage.clickFirstCreateReturnButton();
        await createSalesReturnPage.verifySalesReturnsPageOpened();

        console.log('Step 4: Attempting Business Logic Violation (Over-Refunding)...');
        
        // Find the first product row
        // Check the box to select it
        await createSalesReturnPage.selectFirstProductCheckbox();
        
        // Find the quantity input field in the same row or generic form
        // Usually it's an input of type number or text near the checkbox
        const qtyInput = authenticatedPage.locator('input[name*="Quantity"], input[name*="qty"], input[type="number"], .return-qty input').first();
        
        if (!await qtyInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('Warning: Could not locate a specific return quantity input field. The UI might be strictly enforcing full-quantity returns without editable fields.');
            test.skip(true, 'No editable quantity field found for over-refunding test.');
            return;
        }

        console.log('Step 5: Injecting malicious quantity (9999)...');
        await qtyInput.fill('9999');
        await qtyInput.press('Tab'); // Trigger any onBlur validations

        // Check for instant inline validation errors
        const inlineError = authenticatedPage.locator('.invalid-feedback, .error-message, ion-note[color="danger"], text=/exceeds/i').first();
        if (await inlineError.isVisible({ timeout: 2000 }).catch(() => false)) {
            const errorText = await inlineError.innerText();
            messageValidator.verifyUserFriendlyMessage(errorText);
            console.log(`Success: UI instantly caught the violation inline: "${errorText}"`);
            return; // Test passes if caught early
        }

        console.log('Step 6: Submitting the malicious return request...');
        let requestFired = false;
        await authenticatedPage.route('**/*', async route => {
            const req = route.request();
            if (req.method() === 'POST' && (req.url().includes('return') || req.url().includes('create'))) {
                requestFired = true;
            }
            await route.continue();
        });

        // Click create return
        await createSalesReturnPage.clickCreateReturnButton();

        // Check the final validation outcome
        const result = await createSalesReturnPage.verifyReturnCreatedOrErrorMessage();

        if (result.success === true && result.message.includes('successfully')) {
            console.log('Failure (Business Logic Vulnerability): The system allowed an over-refund of 9999 items!');
            throw new Error('Over-Refund Vulnerability: The system allowed a return quantity greater than the shipped amount.');
        } else {
            console.log(`Success: The system blocked the over-refund. Reason/Message: "${result.message}"`);
        }

    } catch (e) {
      if (e.message.includes('Feature_Not_Supported')) {
        test.skip(true, 'Create Order Return menu option not available for this client');
      } else {
        throw e;
      }
    }
  });

});
