const { test, expect } = require('@playwright/test');

test('Find valid ID', async ({ page }) => {
  await page.goto('https://tnf-sandbox-cr.myshopify.com/password');
  const passwordField = page.getByLabel('Enter store password');
  if (await passwordField.isVisible({ timeout: 5000 }).catch(() => false)) {
    await passwordField.fill('Fu3$}\'Yhke9H+^\'');
    await page.getByRole('button', { name: 'Enter' }).click();
  }

  // Just go to checkout directly assuming we have items in cart from previous tests
  await page.goto('https://tnf-sandbox-cr.myshopify.com/checkout');

  await page.waitForLoadState('domcontentloaded');

  // Try different IDs
  const testCases = [
    { type: 'Cédula de Identidad', value: '101110111' },
    { type: 'Cédula de Identidad', value: '101230456' },
    { type: 'Cédula de Identidad', value: '112345678' },
    { type: 'Pasaporte', value: 'A1234567' },
    { type: 'Pasaporte', value: 'AB123456' },
    { type: 'Pasaporte', value: 'P1234567' },
    { type: 'Número de Identificación Tributaria Especial (NITE)', value: '1234567890' },
    { type: 'Cédula Jurídica', value: '3101123456' },
    { type: 'Documento de Identificación Migratorio para Extranjeros (DIMEX)', value: '12345678901' },
    { type: 'Documento de Identificación Migratorio para Extranjeros (DIMEX)', value: '123456789012' }
  ];

  for (const tc of testCases) {
    const idTypeDropdown = page.getByRole('combobox', { name: /Tipo de identificación/i });
    if (await idTypeDropdown.isVisible()) {
      await idTypeDropdown.selectOption({ label: tc.type });
    }

    const input = page.getByRole('textbox', { name: new RegExp(tc.type, 'i') });
    await input.fill('');
    await input.fill(tc.value);
    await input.press('Tab'); // trigger blur
    await page.waitForTimeout(500); // wait for validation

    const errorVisible = await page.getByText('Número de identificación inválido.').isVisible();
    console.log(`Type: ${tc.type}, Value: ${tc.value} -> Error Visible: ${errorVisible}`);
    
    if (!errorVisible) {
      console.log('SUCCESS! Found a valid combination.');
      break;
    }
  }
});
