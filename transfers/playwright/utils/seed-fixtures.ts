import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Configure via environment variables:
// - SEED_API_URL: seeding endpoint URL
// - PLAYWRIGHT_FIXTURES_FILE: output file for seeded IDs (default: playwright/test-fixtures.json)
// - PLAYWRIGHT_SEED_PAYLOAD_FILE: payload file path (default: playwright/fixtures/seed-payload.json)
const seedUrl = process.env.SEED_API_URL;
const outFile = path.resolve(process.cwd(), process.env.PLAYWRIGHT_FIXTURES_FILE || 'playwright/test-fixtures.json');
const payloadFile = path.resolve(process.cwd(), process.env.PLAYWRIGHT_SEED_PAYLOAD_FILE || 'playwright/fixtures/seed-payload.json');

async function seedFixtures() {
  if (!seedUrl) {
    console.log('No SEED_API_URL provided. To seed fixtures run:');
    console.log('SEED_API_URL=http://localhost:8080/api/test/seed node playwright/seed-fixtures.js');
    process.exit(0);
  }

  if (!fs.existsSync(payloadFile)) {
    console.error(`Seed payload file not found: ${payloadFile}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf-8'));

  const response = await fetch(seedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('Seeding failed:', response.status, body);
    process.exit(1);
  }

  const data = await response.json();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf-8');
  console.log('Wrote fixtures to', outFile);
}

seedFixtures().catch((err) => {
  console.error('Error seeding fixtures:', err);
  process.exit(1);
});
