# Playwright Tests

## Prerequisites
- Node.js and npm installed
- Install dependencies:
  - `npm install`
- Install Playwright browsers:
  - `npx playwright install`

## Run Tests
- Headless:
  - `npm run test:playwright`
- Headed:
  - `npm run test:playwright:headed`
- Direct command:
  - `npx playwright test --config=playwright/playwright.config.ts`
- HTML report:
  - `npm run test:playwright:report`

## Seeding Fixtures (Optional)
- Set `SEED_API_URL` to your seeding endpoint and run:
  - `SEED_API_URL=http://localhost:8080/api/test/seed node playwright/seed-fixtures.js`
- Optional overrides:
  - `PLAYWRIGHT_SEED_PAYLOAD_FILE` (default: `playwright/fixtures/seed-payload.json`)
  - `PLAYWRIGHT_FIXTURES_FILE` (default: `playwright/test-fixtures.json`)
- The script writes fixture output JSON you can use to populate env vars like `TEST_ORDER_ID`.

## Auth / Global Setup
- Preferred: set `TEST_USERNAME` and `TEST_PASSWORD`.
  - Global setup logs in and writes `playwright/.auth/storageState.json`.
- Alternative: provide your own pre-generated `playwright/.auth/storageState.json`.
- If auth generation fails, setup creates an empty storage file so runs do not fail due to a missing file.

## Notes
- Set `BASE_URL` (or `PLAYWRIGHT_BASE_URL`) to test against a different host.
  - Example: `BASE_URL=http://localhost:8081 npm run test:playwright`
- Seed deterministic fixtures in CI and pass required test IDs via environment variables.
