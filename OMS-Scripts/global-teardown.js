/**
 * Playwright Global Teardown
 * 
 * This file is executed exactly once after all Playwright tests have finished running.
 * It is responsible for gracefully shutting down the local Test Data Server
 * to free up port 3456 and prevent EADDRINUSE errors on subsequent runs.
 */
const { stopServer } = require('./data_seeding/testDataServer');

async function globalTeardown(config) {
    console.log('\n[Global Teardown] Cleaning up Test Data Pooler...');
    await stopServer();
}

module.exports = globalTeardown;
