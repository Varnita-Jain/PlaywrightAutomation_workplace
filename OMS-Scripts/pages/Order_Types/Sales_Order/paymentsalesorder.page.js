const { expect } = require('@playwright/test');
const { BaseSalesOrderPage } = require('./base.page');

class PaymentSalesOrderPage extends BaseSalesOrderPage {
  constructor(page, baseURL, clientId) {
    super(page, baseURL, clientId);
  }

  async openTargetSalesOrder(status = 'Approved') {
    // Open an order with the specified status and created by one of our automated names
    await this.openSalesOrderByFilter({ 
      status, 
      anyOfTexts: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Oliver'] 
    });
  }

  // Adjustments Locators
  get addAdjustmentBtn() { return this.page.locator('a[data-dialog-href*="EditAdjustments"], a[title="Adjustments"]').filter({ has: this.page.locator('i.fa-plus') }).first(); }
  get adjustmentsModal() { return this.page.locator('.modal-content:has-text("Adjustments")'); }
  get adjustmentTypeDropdown() { return this.page.locator('#adjustment-orderAdjustmentTypeId'); }
  get amountInput() { return this.page.locator('#amount-adjustment'); }
  get addButton() { return this.page.locator('button[type="submit"].btn-primary:has-text("Add")'); }
  get summarySection() { return this.page.locator('h3:has-text("Summary")'); }

  // Payment Preferences Locators
  get summaryTotal() { return this.page.locator('tr:has-text("Total")').filter({ hasNotText: /Subtotal|Shipment/i }).locator('td.currency-amount, td:last-child').last(); }
  get paymentSectionHeader() { return this.page.locator('.panel-title:has-text("Payment Terms and Preferences"), h3:has-text("Payment Terms and Preferences")'); }
  get addPreferenceBtn() { return this.page.locator('a[data-dialog-href*="AddPaymentToOrder"], a[title="Add Preference"], button[title="Add Preference"]').first(); }
  get addPreferenceModal() { return this.page.locator('.modal-content:has-text("Add Preference")'); }
  get amountFieldModal() { return this.page.locator('#maxAmount, input[name="maxAmount"], #amount'); }
  get preferenceAmounts() { return this.page.locator('#payment-preferences tbody tr td.currency-amount, .preferences-table tbody tr td.currency-amount, .preferences-table tbody tr td:nth-child(4)'); }

  async navigateToOrderDetails(orderId) {
    await this.page.goto(`${this.baseURL}/commerce/control/ViewOrder?orderId=${orderId}`);
  }

  /**
   * Expands the Payment Terms section if it's collapsed.
   */
  async expandPaymentSection() {
    // fa-caret-right usually indicates collapsed, fa-caret-down indicates expanded
    const isCollapsed = await this.paymentSectionHeader.locator('.fa-caret-right').isVisible();
    if (isCollapsed) {
      console.log('Payment section is collapsed. Expanding...');
      await this.paymentSectionHeader.click();
      await this.page.waitForTimeout(1000);
    } else {
      console.log('Payment section is already expanded.');
    }
  }

  /**
   * Gets the total amount from the Summary section.
   * @returns {number}
   */
  async getSummaryTotal() {
    // Exact match for "Total" to avoid "Subtotal"
    // Find the Total value from definition list (dt/dd pair)
    const totalLabel = this.page.locator('dt').filter({ hasText: /^Total$/ }).first();
    const totalValue = totalLabel.locator('xpath=following-sibling::dd').first();
    const text = await totalValue.textContent();
    return this.parseCurrency(text);
  }

  /**
   * Calculates the sum of all amounts in the Preferences table.
   * @returns {number}
   */
  async getPreferencesSum() {
    return await this.page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      // Find the table that likely contains payment preferences
      const prefTable = tables.find(t => {
        const text = (t.innerText || '').trim();
        return text.includes('Amt') && (text.includes('Method') || text.includes('Type') || text.includes('Status') || text.includes('Description'));
      });
      
      if (!prefTable) return 0;
      
      const headers = Array.from(prefTable.querySelectorAll('th'));
      const amtIndex = headers.findIndex(h => h.innerText.includes('Amt'));
      if (amtIndex === -1) return 0;

      const rows = Array.from(prefTable.querySelectorAll('tbody tr'));
      let sum = 0;
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells[amtIndex]) {
          const amtText = cells[amtIndex].innerText || '0';
          sum += parseFloat(amtText.replace(/[^0-9.-]+/g, "")) || 0;
        }
      });
      return sum;
    });
  }

  /**
   * Parses a currency string and returns the value and detected type.
   * This method is currency-aware and supports:
   * 1. Standard (USD/GBP/EUR) -> USES decimals
   * 2. Integer (JPY) -> NO decimals
   * 3. Other -> String comparison fallback
   * @param {string} text 
   * @returns {{value: number, type: 'standard' | 'integer' | 'other', raw: string}}
   */
  parseCurrency(text) {
    if (!text) return { value: 0, type: 'other', raw: '' };
    
    // Clean string for comparison (keeps digits, dots, commas, and minus sign)
    const raw = text.replace(/[^0-9.,-]/g, "").trim();
    
    // Determine the currency type based on the symbol present in the text
    let type = 'other';
    if (text.includes('¥')) {
      type = 'integer'; // JPY is handled as an integer (no decimals)
    } else if (text.includes('$') || text.includes('£') || text.includes('€')) {
      type = 'standard'; // USD, CAD, AUD, GBP, EUR are handled with 2-decimal precision
    }

    // Parse the string to a floating point number for mathematical calculations
    // We strip everything except digits, decimal points, and signs
    const value = parseFloat(text.replace(/[^0-9.-]+/g, "")) || 0;
    
    return { value, type, raw };
  }
}

module.exports = { PaymentSalesOrderPage };
