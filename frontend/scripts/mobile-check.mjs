import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const settings = {
  screenshotDir: path.join(rootDir, '../e2e/screenshots/mobile'),
  webBase: process.env.WEB_URL ?? 'http://localhost:3000',
  apiBase: process.env.API_URL ?? 'http://localhost:4000/api',
  device: devices['iPhone 14'],
  password: 'DemoPass123',
  displayName: 'user',
  signupRetries: 4,
  retryBaseMs: 4000,
  settlePublicMs: 300,
  settleAuthMs: 400,
};

const seedGoals = {
  dailyCalories: 1950,
  proteinGrams: 125,
  carbGrams: 190,
  fatGrams: 60,
  targetWeightKg: 72,
};

const seedEntry = {
  foodName: 'Egg toast',
  mealType: 'breakfast',
  quantity: 1,
  unit: 'plate',
  calories: 360,
  proteinGrams: 17,
  carbGrams: 30,
  fatGrams: 15,
};

const seedWeight = {
  kg: 71.4,
  note: 'Weekly check-in',
};

const publicPages = [
  ['01-landing', '/'],
  ['02-login', '/login'],
  ['03-signup', '/signup'],
];

const authPages = [
  ['04-today', '/dashboard'],
  ['05-log', '/log'],
  ['06-entries', '/entries'],
  ['07-goals', '/goals'],
  ['08-weight', '/weight'],
  ['09-reports', '/reports'],
  ['10-chat', '/chat'],
  ['11-import', '/import'],
];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callApi(pathname, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${settings.apiBase}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${pathname} ${response.status}: ${text}`);
  }
  return data;
}

async function createSeededUser() {
  const email = `mobile.user.${Date.now()}@example.com`;
  const today = localDateKey();
  let lastError;

  for (let attempt = 1; attempt <= settings.signupRetries; attempt += 1) {
    try {
      const { token } = await callApi('/auth/signup', {
        method: 'POST',
        body: {
          email,
          password: settings.password,
          displayName: settings.displayName,
        },
      });

      await callApi('/goals', {
        method: 'POST',
        token,
        body: {
          ...seedGoals,
          effectiveFrom: today,
        },
      });

      await callApi('/entries', {
        method: 'POST',
        token,
        body: {
          ...seedEntry,
          consumedOn: today,
        },
      });

      await callApi('/weights', {
        method: 'POST',
        token,
        body: {
          ...seedWeight,
          loggedOn: today,
        },
      });

      return token;
    } catch (error) {
      lastError = error;
      await sleep(settings.retryBaseMs * attempt);
    }
  }

  throw lastError;
}

async function hideNextBadge(page) {
  await page
    .addStyleTag({
      content: 'nextjs-portal,[data-next-badge-root]{display:none!important}',
    })
    .catch(() => {});
}

async function saveShot(page, name) {
  await hideNextBadge(page);
  const file = path.join(settings.screenshotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}

async function capturePage(page, name, route, { waitForHeading = false } = {}) {
  await page.goto(`${settings.webBase}${route}`, { waitUntil: 'networkidle' });
  if (waitForHeading) {
    await page.locator('h1').first().waitFor();
  }
  await sleep(waitForHeading ? settings.settleAuthMs : settings.settlePublicMs);
  await saveShot(page, name);
}

async function run() {
  await mkdir(settings.screenshotDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ ...settings.device });
  const page = await context.newPage();

  for (const [name, route] of publicPages) {
    await capturePage(page, name, route);
  }

  const token = await createSeededUser();
  await page.addInitScript((value) => {
    window.localStorage.setItem('calorie-tracker.token', value);
  }, token);

  for (const [name, route] of authPages) {
    await capturePage(page, name, route, { waitForHeading: true });
  }

  await page.getByRole('button', { name: 'More' }).click();
  await sleep(settings.settlePublicMs);
  await saveShot(page, '12-more');

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
