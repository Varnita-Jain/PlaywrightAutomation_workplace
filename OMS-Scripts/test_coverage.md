# Test Coverage Document

This document outlines the current test automation coverage for the OMS Playwright Automation repository, covering both Storefront Checkout flows and HotWax Order Management System (OMS) E2E flows.

## 1. OMS Sales Order Automation

The OMS automation suite has been heavily refactored into an **Atomic Data Pooling Architecture** allowing tests to run entirely independently and securely in parallel.

### Supported Flows
All of the following flows are fully automated and utilize the `pooledOrder` fixture to dynamically consume unique orders. They all feature dynamic webhook polling, graceful UI fallbacks, and **full cross-client localization** (no hardcoded English strings), allowing the same scripts to run against Client A, Client B, Client C, Client D, and Client E environments seamlessly:

| Test Case / Flow | Spec File | Coverage Status | Actions Performed |
|-------------------|-----------|-----------------|-------------------|
| **Cancel Order** | `cancelorder.spec.js` | **Fully Automated** | Locates created order, approves it, and fully cancels it. |
| **Release Order** | `releasesalesorder.spec.js` | **Fully Automated** | Locates approved order, releases it to a specific facility, and verifies shipment origin. |
| **Broker Order** | `salesorder_brokernow.spec.js` | **Fully Automated** | Locates an order in the Brokering Queue and triggers the manual 'Broker Now' routine. |
| **Reject Item** | `rejectsalesorderitem.spec.js` | **Fully Automated** | Locates a brokered order, selects a line item, and rejects it with a reason code. |
| **Edit Shipment** | `editshipmentmethod.spec.js` | **Fully Automated** | Locates an approved order and modifies the shipment method/speed. |

### OMS Execution Commands

**Prerequisites:** 
You **must** configure your `.env` file with a valid `productVariantGid` for your target client to allow Shopify to generate real mapped products. If left blank, HotWax will ignore the generated orders.

**1. Seed the Data Pool (Recommended before test execution)**
Generates organic orders via the Shopify REST API and places them in `data/pooledOrders.csv` for the test workers to consume.
```bash
npm run test:oms:seed
```

**2. Run Specific Flow (Example: Release Order on Client A)**
Runs a single test flow against a specific client project, demonstrating data pooling consumption:
```bash
CLIENT=client-id-uat npx playwright test "tests/Order_Types/Sales_Order/releasesalesorder.spec.js" --project="client-id-uat - Chromium" --headed
```

**3. Run Full Parallel Suite (All Clients & Flows)**
Automatically boots the Local Data API Server, spins up parallel workers, parses the CSV, hands out unique orders, and executes the entire matrix safely:
```bash
npm run test:oms
```

## 2. Additional OMS Domains

Beyond core Sales Order processing, the suite now deeply covers auxiliary systems with randomized data selection and robust UX assertion mechanisms (`MessageValidator`).

| Domain | Test Case / Flow | Spec File | Coverage Status | Actions Performed |
|--------|-------------------|-----------|-----------------|-------------------|
| **Return Order** | Create Sales Return | `createsalesreturn.spec.js` | **Fully Automated** | Locates an order >30 days old, clicks a **randomized** return button, and submits the return flow. |
| **Return Order** | Sales Return Filters | `salesreturn.spec.js` | **Fully Automated** | Validates the empty states and active states of all return filtering dropdowns using robust, case-insensitive substring matching. |
| **PIM** | Products Flow | `products.spec.js` | **Full E2E** | Exhaustive validation of Product Information. Mutates SKU/Brand/Name, validates UI forms, rolls back data cleanly, triggers Reindex, and validates OFBiz server-rendered success banners via `MessageValidator`. |
| **PIM** | Promo Codes | `PromoCodes.spec.js` | **Fully Automated** | Generates a new Promo Code ("Winter Offer"), asserts success toasts, and deletes the code. |
| **Settings** | Create JWT Token | `CreateJWTToken.spec.js` | **Fully Automated** | Simulates admin config flow to generate a 30-day JWT authentication token. |

### Global UX Resilience (`MessageValidator`)
All Negative Flows and Page Objects are integrated with a custom `MessageValidator` class. It enforces strict UX rules by asserting that end-users never see raw backend JSON, SQL stack traces, or Java NullPointer exceptions when an error occurs, checking both modern client-side toasts and older server-rendered OFBiz banners (`.eventMessage`, `.alert-success`).

## 3. Storefront Automation

The automation suite also covers the end-to-end purchasing flows across various client storefronts. 

### Supported Clients & Environments

| Client | Region | Environment | Coverage Status | Notes |
|--------|--------|-------------|-----------------|-------|
| `adoc-cr` | Costa Rica | UAT (`adoc-cr-uat`) | **Full E2E** | Full Shopify checkout flow automated. |

### Feature Coverage (`adoc-cr-uat`)

#### 1. Storefront Authentication
- Automatic detection and bypassing of the Shopify password page.
- Reliable waiting strategies to handle URL redirection upon successful authentication.

#### 2. Product Discovery & Selection
- Homepage loading and brand validation.
- "Quick Add" functionality from product grids.
- Cart modal interactions and progression to the checkout phase.

#### 3. Dynamic Checkout Forms
- **Contact Information:** Email entry.
- **Identification:** Selection of ID type and handling of regional strict validation by simulating user blur/tab events.
- **Shipping Information:** Address entry and dynamic province/cantón/distrito combobox selections.

#### 4. Payment Processing
- Automatic detection of standard payment iframes vs. Shopify pre-saved/remembered cards.
- Filling of credit card number, cardholder name, expiry, and CVV inside isolated `frameLocators`.

#### 5. Order Confirmation
- Verification of the final "Pagar ahora" (Pay Now) submission.
- Validation of the "Tu pedido está confirmado" (Order Confirmed) success page.
- **Order ID Extraction:** Successfully extracts the Order ID/Token directly from the final URL and stores it for downstream OMS integration tests.
