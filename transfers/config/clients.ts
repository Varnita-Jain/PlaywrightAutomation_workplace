import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

function getClientsEnvString() {
  // Read .env manually because dotenv truncates multiline strings without double quotes
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/CLIENTS='?(\{[\s\S]*\})'?/);
      if (match) {
        return match[1]; // The raw JSON string
      }
    }
  } catch (e) {
    // Ignore and fallback to process.env
  }
  return process.env.CLIENTS;
}

/**
 * Dynamic Client Manager for Fulfillment
 */

const resolveUrl = (clientId: any, customUrl?: any) => {
  if (customUrl) return customUrl;

  if (clientId.endsWith("-uat")) {
    return "https://transfers-uat.hotwax.io";
  }

  return `https://transfers.hotwax.io`;
};

const getClientConfig = (clientId: any) => {
  if (!clientId) throw new Error("clientId is required.");

  let config: any = { clientId };

  // Tier 1: Global CLI Overrides (Highest Priority)
  const baseUrl = process.env.URL || process.env.PLAYWRIGHT_BASE_URL;
  const username = process.env.USERNAME || process.env.TEST_USERNAME || process.env.VUE_APP_PLAYWRIGHT_USERNAME;
  const password = process.env.PASSWORD || process.env.TEST_PASSWORD || process.env.VUE_APP_PLAYWRIGHT_PASSWORD;

  // Tier 3: Fallback to Structured JSON for missing fields
  const clientsStr = getClientsEnvString();
  if (clientsStr) {
    try {
      // Robustly extract JSON object from the string, ignoring leading/trailing quotes or newlines
      const match = clientsStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON object found in CLIENTS env var");
      
      const rawJson = match[0];
      const clientsMap = JSON.parse(rawJson);
      const clientData = clientsMap[clientId] || {};

      config = {
        ...config,
        ...clientData,
        username: username || clientData.username,
        password: password || clientData.password,
        url: clientData.url || clientData.baseUrl,
        oms: clientData.oms,
        baseUrl: resolveUrl(clientId, baseUrl || clientData.url || clientData.baseUrl)
      };
    } catch (e: any) {
      console.error(
        `Configuration [CLIENTS, Client: ${clientId}] - Failed to parse in getClientConfig: ${e.message}`
      );
    }
  }

  // Ensure we at least have a resolved URL if nothing was found in JSON
  if (!config.baseUrl) {
    config.baseUrl = resolveUrl(clientId, baseUrl);
  }

  return config;
};

const getAllClients = () => {
  const discoveredIds = new Set<string>();

  const clientsStr = getClientsEnvString();
  if (clientsStr) {
    try {
      const match = clientsStr.match(/\{[\s\S]*\}/);
      if (match) {
        Object.keys(JSON.parse(match[0])).forEach((id) =>
          discoveredIds.add(id)
        );
      }
    } catch (e) {
      console.error("Configuration [CLIENTS] - Failed to parse in getAllClients", e);
    }
  }

  // Fallback to dev-oms if no clients provided
  if (discoveredIds.size === 0) {
    discoveredIds.add("dev-oms");
  }

  return Array.from(discoveredIds).map((id) => getClientConfig(id));
};

export {
  getClientConfig,
  getAllClients,
};
