const { test, expect } = require('../../fixtures/fixtures');

test.describe('Warehouse / Picklist Flow', () => {
  test('should navigate to Picklist, apply filters, and verify results', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    // 1. Navigate directly to Picklist
    await authenticatedPage.goto(`${url.origin}/commerce/control/ManagePicklist`);
    await authenticatedPage.waitForLoadState('load');
    await authenticatedPage.waitForTimeout(1000);

    // 2. Select 1st option from Facility dropdown
    await authenticatedPage.getByRole('combobox').nth(0).click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.waitForTimeout(1000); 

    // 3. Select 3rd option from Status dropdown (index 2)
    await authenticatedPage.getByRole('combobox').nth(1).click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.waitForTimeout(1000); 

    // 4. Date dropdown: click downward arrow and select "More than 30 days"
    await authenticatedPage.getByText('Date', { exact: true }).locator('..').locator('button').last().click();
    await authenticatedPage.waitForTimeout(500);
    
    await authenticatedPage.locator('text="More than 30 days"').first().click();
    await authenticatedPage.waitForTimeout(3000); // Allow results to fetch

    // 5. Verify results or "No Picklists Found."
    const noPicklistsFound = authenticatedPage.locator('text="No Picklists Found."').first();
    const hasDataRow = authenticatedPage.locator('table tbody tr, .list-group-item, .card').first();

    if (await noPicklistsFound.isVisible().catch(() => false)) {
        await expect(noPicklistsFound).toBeVisible();
    } else {
        await expect(hasDataRow).toBeVisible();
    }
  });
});
