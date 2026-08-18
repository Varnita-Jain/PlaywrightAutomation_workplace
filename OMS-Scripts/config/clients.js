/**
 * Dynamic Client Manager
 * 
 * This module discovers and configures clients from environment variables.
 * Optimization: Automatically generates HotWax URLs based on the Client ID.
 */

/**
 * Constructs a standard HotWax URL if not explicitly provided
 * @param {string} clientId 
 * @param {string} customUrl 
 */
const resolveUrl = (clientId, customUrl) => {
  if (customUrl) return customUrl;

  return `https://${clientId}.hotwax.io/webtools/control/main`;
};

/**
 * Helper to get environment prefix
 */
const getEnvPrefix = (key) => key.toUpperCase().replace(/-/g, '_');

/**
 * Retrieves a configuration for a single client
 */
const getClientConfig = (clientId) => {
  const key = clientId || process.env.CLIENT;
  if (!key) throw new Error('CLIENT environment variable is not set.');

  let config = { clientId: key, name: key };

  // =========================================================
  // TIER 1: Global CLI Overrides (Highest Priority)
  // TIER 2: Client-Specific Prefixed Env Vars (e.g., SM_UAT_URL)
  // =========================================================
  // This allows developers to quickly override configs via the terminal
  // (e.g., `CLIENT=krewe-uat URL=http... npm run test:oms`)
  const prefix = getEnvPrefix(key);
  const baseUrl = process.env.URL || process.env[`${prefix}_URL`];
  const username = process.env.USERNAME || process.env[`${prefix}_USERNAME`];
  const password = process.env.PASSWORD || process.env[`${prefix}_PASSWORD`];

  // If ANY of these are provided via CLI/Flat Env, use them and fill gaps from JSON
  if (baseUrl || username || password) {
    config = {
      ...config,
      baseUrl: resolveUrl(key, baseUrl),
      username: username,
      password: password
    };
  }

  // =========================================================
  // TIER 3: Fallback to Structured JSON (Primary Data Source)
  // =========================================================
  // If the CLI or prefixed env vars didn't provide full details,
  // we attempt to parse the robust `CLIENTS` JSON object from .env.
  if (process.env.CLIENTS) {
    try {
      const clientsStr = process.env.CLIENTS.replace(/^'|'$/g, '').replace(/\\\\'/g, "'");
      try {
        const clientsMap = JSON.parse(clientsStr);
        const data = clientsMap[key] || {};
        return {
          ...config,
          name: data.name || config.name,
          baseUrl: config.baseUrl || resolveUrl(key, data.url || data.baseUrl),
          username: config.username || data.username,
          password: config.password || data.password,
          shopify: data.shopify || {}
        };
      } catch (parseErr) {
        throw parseErr;
      }
    } catch (e) {
      console.error("[Config Error] Failed to parse CLIENTS JSON:", e);
    }
  }

  return config;
};

/**
 * Discovers all configured clients
 */
const getAllClients = () => {
  const discoveredIds = new Set();

  if (process.env.CLIENTS) {
    try {
      const clientsStr = process.env.CLIENTS.replace(/^'|'$/g, '').replace(/\\\\'/g, "'");
      Object.keys(JSON.parse(clientsStr)).forEach(id => discoveredIds.add(id));
    } catch (e) { }
  }

  Object.keys(process.env).forEach(envKey => {
    if (envKey.endsWith('_URL') || envKey.endsWith('_USERNAME')) {
      const id = envKey.replace(/_URL$|_USERNAME$/, '').toLowerCase().replace(/_/g, '-');
      discoveredIds.add(id);
    }
  });

  return Array.from(discoveredIds).map(id => getClientConfig(id));
};

module.exports = {
  getClientConfig,
  getAllClients
};
