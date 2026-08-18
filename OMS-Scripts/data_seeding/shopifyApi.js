/**
 * Shopify API Utility
 * 
 * This utility handles the low-level HTTP requests to the Shopify Admin REST API.
 * It uses the credentials dynamically loaded from the config/clients.js module
 * to authenticate and post the JSON payload required to create a new order.
 * 
 * Update: Now supports dynamic multi-line item generation. It parses the
 * 'productVariants' array from the client configuration to randomly inject
 * 1-3 distinct line items into the order payload, complete with explicit SKUs
 * and Titles to prevent Shopify 422 Unprocessable Entity errors.
 */
const https = require('https');
const { getClientConfig } = require('../config/clients');

/**
 * Creates an order directly in Shopify via the REST Admin API
 * @param {string} clientId
 * @returns {Promise<string>} The created Shopify Order Name (e.g. #1001)
 */
function createShopifyOrder(clientId) {
    return new Promise((resolve, reject) => {
        const config = getClientConfig(clientId);
        if (!config || !config.shopify || !config.shopify.accessToken || config.shopify.accessToken.includes('newera')) {
            return reject(new Error(`[Shopify API] Invalid or missing Shopify credentials for ${clientId}.`));
        }

        const { shopName, apiVersion, accessToken, productVariants, productVariantGids, productVariantGid, customAttributes } = config.shopify;
        
        // Dynamically build line items
        let lineItems = [];
        
        if (productVariants && Array.isArray(productVariants) && productVariants.length > 0) {
            // Determine how many distinct line items to create (1 to min(length, 3))
            const maxItems = Math.min(productVariants.length, 3);
            const numItems = Math.floor(Math.random() * maxItems) + 1; // 1 to maxItems
            
            // Shuffle array to pick random distinct items
            const shuffled = [...productVariants].sort(() => 0.5 - Math.random());
            const selectedVariants = shuffled.slice(0, numItems);
            
            console.log(`[Shopify API] Randomly selected ${numItems} variant(s): ${selectedVariants.map(v => v.gid).join(', ')}`);
            
            lineItems = selectedVariants.map(variant => {
                const variantId = variant.gid.replace(/\D/g, '');
                // Random quantity between 1 and 2
                const quantity = Math.floor(Math.random() * 2) + 1;
                return {
                    variant_id: parseInt(variantId),
                    quantity: quantity,
                    sku: variant.sku,
                    title: variant.title,
                    price: "100.00" // Inject explicit price to prevent 422 errors if variant is unpublished
                };
            });
        } else if (productVariantGids && Array.isArray(productVariantGids) && productVariantGids.length > 0) {
            // Fallback for older format
            const uniqueGids = [...new Set(productVariantGids)];
            const maxItems = Math.min(uniqueGids.length, 3);
            const numItems = Math.floor(Math.random() * maxItems) + 1;
            const shuffled = uniqueGids.sort(() => 0.5 - Math.random());
            const selectedGids = shuffled.slice(0, numItems);
            
            console.log(`[Shopify API] Randomly selected ${numItems} variant(s): ${selectedGids.join(', ')}`);
            lineItems = selectedGids.map(gid => ({
                variant_id: parseInt(gid.replace(/\D/g, '')),
                quantity: Math.floor(Math.random() * 2) + 1,
                price: "100.00"
            }));
        } else if (productVariantGid) {
            // Fallback for single string format
            const quantity = Math.floor(Math.random() * 3) + 1;
            console.log(`[Shopify API] Using single variant with quantity ${quantity}`);
            lineItems = [{
                variant_id: parseInt(productVariantGid.replace(/\D/g, '')),
                quantity: quantity,
                price: "100.00"
            }];
        } else {
            return reject(new Error(`[Shopify API] Missing productVariants for ${clientId}.`));
        }

        // Calculate total amount for the transaction to prevent mismatches
        const totalAmount = lineItems.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0).toFixed(2);

        const firstNames = ["Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia", "James", "Isabella", "Oliver"];
        const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
        const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];

        const realisticAddresses = [
            { address1: "112/2 Zens Area", city: "Salt Lake City", province: "UT", country: "US", zip: "84001" },
            { address1: "456 Market St", city: "San Francisco", province: "CA", country: "US", zip: "94105" },
            { address1: "789 Broadway", city: "New York", province: "NY", country: "US", zip: "10003" },
            { address1: "101 Washington Ave", city: "Miami", province: "FL", country: "US", zip: "33132" },
            { address1: "555 Congress Ave", city: "Austin", province: "TX", country: "US", zip: "78701" }
        ];
        const randomAddress = realisticAddresses[Math.floor(Math.random() * realisticAddresses.length)];

        const address = {
            first_name: randomFirstName,
            last_name: randomLastName,
            address1: randomAddress.address1,
            city: randomAddress.city,
            province: randomAddress.province,
            country: randomAddress.country,
            zip: randomAddress.zip
        };

        // =====================================================================
        // Shopify REST API Order Payload
        // =====================================================================
        // This constructs the JSON payload required to POST to /admin/api/.../orders.json.
        // It mimics a fully authorized checkout transaction, injecting the dynamic 
        // line items, realistic addresses, and auto-calculating the total amount
        // to bypass Shopify's fraud/validation checks for unpublished variants.
        const payloadObject = {
            order: {
                line_items: lineItems,
                financial_status: "authorized", 
                email: `${randomFirstName.toLowerCase()}.${randomLastName.toLowerCase()}@example.com`,
                customer: {
                    first_name: randomFirstName,
                    last_name: randomLastName
                },
                shipping_address: address,
                billing_address: address,
                transactions: [
                    {
                        kind: "authorization",
                        status: "success",
                        amount: totalAmount
                    }
                ]
            }
        };

        // Inject shipping_lines if defined in config
        if (config.shopify.shippingLines && Array.isArray(config.shopify.shippingLines) && config.shopify.shippingLines.length > 0) {
            payloadObject.order.shipping_lines = config.shopify.shippingLines;
        }

        // Inject note_attributes and tags if customAttributes are defined in config
        if (customAttributes && Array.isArray(customAttributes) && customAttributes.length > 0) {
            payloadObject.order.note_attributes = customAttributes.map(attr => ({
                name: attr.key,
                value: attr.value
            }));
            
            // Also add them as tags since HotWax often filters on Shopify tags
            payloadObject.order.tags = customAttributes.map(attr => attr.key).join(',');
            
            console.log(`[Shopify API] Injecting ${customAttributes.length} note attributes & tags into payload (e.g. ${customAttributes[0].key})`);
        }

        const payload = JSON.stringify(payloadObject);

        const options = {
            hostname: `${shopName}.myshopify.com`,
            path: `/admin/api/${apiVersion || '2024-01'}/orders.json`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'X-Shopify-Access-Token': accessToken
            }
        };

        console.log(`[Shopify API] Creating order for ${clientId} on ${shopName}...`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const parsed = JSON.parse(data);
                    // HotWax typically searches by the Shopify Order Name (e.g. #1234)
                    const orderName = parsed.order.name; 
                    console.log(`[Shopify API] Successfully created order: ${orderName}`);
                    resolve(orderName);
                } else {
                    reject(new Error(`Shopify API Error: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

module.exports = { createShopifyOrder };
