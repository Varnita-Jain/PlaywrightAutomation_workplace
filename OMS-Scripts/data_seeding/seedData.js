/**
 * Data Seeding Executable Script
 * 
 * Run via: npm run test:oms:seed
 * 
 * This script generates organic test orders directly against the Shopify REST API.
 * The resulting order IDs are dumped into the data/pooledOrders.csv file, 
 * which is then read by the testDataServer during Playwright test execution.
 */
require('dotenv').config();
const { createShopifyOrder } = require('./shopifyApi');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { performLogin } = require('../utils/auth');
const { getClientConfig } = require('../config/clients');

async function seed() {
    const client = process.env.CLIENT || 'krewe-uat';
    try {
        const numOrders = parseInt(process.env.NUM_ORDERS || '1', 10);
        const dataPath = path.join(__dirname, '../data');
        if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);
        
        const csvPath = path.join(dataPath, 'pooledOrders.csv');
        // Overwrite file with header
        fs.writeFileSync(csvPath, `clientId,orderId\n`);
        
        let firstOrderId = null;
        for (let i = 0; i < numOrders; i++) {
            console.log(`[Seed] Generating order ${i+1}/${numOrders} for ${client} via Shopify API...`);
            const orderId = await createShopifyOrder(client);
            if (i === 0) firstOrderId = orderId;
            fs.appendFileSync(csvPath, `${client},${orderId}\n`);
            console.log(`[Seed] Successfully seeded ${orderId}`);
        }
        console.log(`\n[WARNING] Note: Orders created in Shopify typically take time to sync to HotWax OMS.`);
        
        if (firstOrderId) {
            // =====================================================================
            // HotWax Webhook Sync Validation (6-Minute Polling Loop)
            // =====================================================================
            // Shopify orders don't appear in HotWax instantly. Webhooks must fire, 
            // and the OMS must process them. This loop actively polls the OMS UI
            // every 2 minutes (up to 3 times) to ensure the newly minted order has
            // officially landed before we unleash the parallel test workers on it.
            console.log(`[Seed] Initiating 2-minute interval polling for up to 6 minutes to verify sync for ${firstOrderId}...`);
            const config = getClientConfig(client);
            const browser = await chromium.launch();
            const context = await browser.newContext({ baseURL: config.baseUrl });
            const page = await context.newPage();
            
            await performLogin(page, config);
            
            const maxAttempts = 3;
            let synced = false;
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                console.log(`[Polling] Attempt ${attempt}/${maxAttempts} - Checking if ${firstOrderId} exists in HotWax...`);
                
                const base = new URL(config.baseUrl);
                const searchUrl = `${base.origin}/commerce/control/FindOrder?keyword=${encodeURIComponent(firstOrderId)}&userSearchPrefTypeId=SALES_ORDER_QUERY`;
                await page.goto(searchUrl);
                await page.waitForTimeout(2000);
                
                const targetRow = page.locator('tbody tr').filter({ hasText: firstOrderId }).first();
                if (await targetRow.isVisible().catch(() => false)) {
                    console.log(`[Polling] Success! Order ${firstOrderId} has been synced to HotWax.`);
                    synced = true;
                    break;
                }
                
                if (attempt < maxAttempts) {
                    console.log(`[Polling] Not found. Waiting 2 minutes before next check...`);
                    await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
                }
            }
            
            await browser.close();
            if (!synced) {
                console.log(`[WARNING] Order ${firstOrderId} not found after 6 minutes. Proceeding anyway, but tests may fail if data is missing.`);
            }
        }
    } catch (e) {
        console.error(`[Seed] Error seeding data:`, e.message);
    }
}

seed();
