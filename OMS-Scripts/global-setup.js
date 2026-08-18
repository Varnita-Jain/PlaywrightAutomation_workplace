/**
 * Playwright Global Setup
 * 
 * This file is executed exactly once before any Playwright tests begin running.
 * It is responsible for initializing the local Test Data Server (testDataServer.js)
 * on port 3456 so that parallel tests can fetch organic order IDs from the pool.
 */
const { startServer } = require('./data_seeding/testDataServer');

async function globalSetup(config) {
    console.log('\n[Global Setup] Initializing Test Data Pooler...');
    
    // Dynamically calculate how many orders to seed based on workers/tests or set a default.
    // For now, we will seed a default batch (e.g., 5 orders) every time the suite runs.
    const { execSync } = require('child_process');
    try {
        console.log('[Global Setup] Auto-seeding organic Shopify data...');
        // Pass a default of 5 orders, but it can be overridden by ENV vars in the CLI
        execSync(`NUM_ORDERS=${process.env.NUM_ORDERS || 5} node data_seeding/seedData.js`, { stdio: 'inherit' });
    } catch (e) {
        console.error('[Global Setup] Warning: Data Seeding failed or was interrupted. Tests may fall back to UI search.');
    }
    
    await startServer(3456);
}

module.exports = globalSetup;
