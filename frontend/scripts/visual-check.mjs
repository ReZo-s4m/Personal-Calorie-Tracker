import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const settings = {
  screenshotDir: path.join(rootDir, '../e2e/screenshots'),
  webBase: process.env.WEB_URL ?? 'http://localhost:3000',
  apiBase: process.env.API_URL ?? 'http://localhost:4000/api',
  viewport: { width: 1440, height: 900 },
  password: 'DemoPass123',
  displayName: 'user',
  settleMs: 400,
  importTimeoutMs: 20_000,
};

const seedGoals = {
  dailyCalories: 1950,
  proteinGrams: 125,
  carbGrams: 190,
  fatGrams: 60,
  targetWeightKg: 72,
};

const seedMeals = [
  {
    daysAgo: 0,
    foodName: 'Egg toast',
    mealType: 'breakfast',
    quantity: 1,
    unit: 'plate',
    calories: 360,
    proteinGrams: 17,
    carbGrams: 30,
    fatGrams: 15,
  },
  {
    daysAgo: 0,
    foodName: 'Chicken bowl',
    mealType: 'lunch',
    quantity: 1,
    unit: 'bowl',
    calories: 540,
    proteinGrams: 38,
    carbGrams: 52,
    fatGrams: 17,
  },
  {
    daysAgo: 1,
    foodName: 'Veg pasta',
    mealType: 'dinner',
    quantity: 1,
    unit: 'plate',
    calories: 610,
    proteinGrams: 21,
    carbGrams: 74,
    fatGrams: 22,
  },
  {
    daysAgo: 2,
    foodName: 'Protein shake',
    mealType: 'snack',
    quantity: 1,
    unit: 'serving',
    calories: 150,
    proteinGrams: 25,
    carbGrams: 6,
    fatGrams: 3,
  },
  {
    daysAgo: 3,
    foodName: 'Poha',
    mealType: 'breakfast',
    quantity: 1,
    unit: 'bowl',
    calories: 280,
    proteinGrams: 8,
    carbGrams: 46,
    fatGrams: 7,
  },
];

const pages = [
  ['dashboard', '/dashboard', 'Today'],
  ['log', '/log', 'Log a Meal'],
  ['goals', '/goals', 'Set Your Goals'],
  ['entries', '/entries', 'Entries'],
  ['reports', '/reports', 'Reports'],
  ['chat', '/chat', 'Chat support'],
  ['import-empty', '/import', 'Bulk import'],
];

const pdfRows = [
  'Date | Meal | Food | Qty | Unit | Calories | Protein | Carbs | Fat',
  '2026-08-10 | Breakfast | Egg toast | 1 | plate | 360 | 17 | 30 | 15',
  '2026-08-11 | Lunch | Chicken bowl | 1 | bowl | 540 | 38 | 52 | 17',
  '2026-08-12 | Dinner | Veg pasta | 1 | plate | 610 | 21 | 74 | 22',
  '2026-08-13 | Snacks | Protein shake | 1 | serving | 150 | 25 | 6 | 3',
  '2026-08-14 | Breakfast | Poha | 1 | bowl | 280 | 8 | 46 | 7',
];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildDiaryPdf(lines) {
  const streamBody = [
    'BT',
    '/F1 11 Tf',
    '50 760 Td',
    ...lines.flatMap((line, index) =>
      index === 0 ? [`(${escapePdfText(line)}) Tj`] : ['0 -16 Td', `(${escapePdfText(line)}) Tj`],
    ),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(streamBody)} >>\nstream\n${streamBody}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${offsets.length - 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefAt = Buffer.byteLength(pdf);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function callApi(pathname, { method = 'GET', token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let init;
  if (form) {
    init = { method, headers, body: form };
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init = { method, headers, body: JSON.stringify(body) };
  } else {
    init = { method, headers };
  }

  const response = await fetch(`${settings.apiBase}${pathname}`, init);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${pathname} ${response.status}: ${text}`);
  }
  return data;
}

async function createSeededUser() {
  const email = `visual.user.${Date.now()}@example.com`;
  const today = localDateKey();

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

  for (const meal of seedMeals) {
    const { daysAgo, ...entry } = meal;
    await callApi('/entries', {
      method: 'POST',
      token,
      body: {
        ...entry,
        consumedOn: dateDaysAgo(daysAgo),
      },
    });
  }

  return token;
}

async function saveShot(page, name) {
  const file = path.join(settings.screenshotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}

async function capturePage(page, name, route, heading) {
  await page.goto(`${settings.webBase}${route}`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: heading }).waitFor();
  await page.waitForTimeout(settings.settleMs);
  await saveShot(page, name);
}

async function run() {
  await mkdir(settings.screenshotDir, { recursive: true });
  const token = await createSeededUser();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: settings.viewport });
  await page.addInitScript((value) => {
    window.localStorage.setItem('calorie-tracker.token', value);
  }, token);

  for (const [name, route, heading] of pages) {
    await capturePage(page, name, route, heading);
  }

  const pdf = buildDiaryPdf(pdfRows);
  await page.locator('#bulk-import-file').setInputFiles({
    name: 'sample_meal_data.pdf',
    mimeType: 'application/pdf',
    buffer: pdf,
  });
  await page.getByRole('button', { name: /Import \d+ entries/ }).waitFor({
    timeout: settings.importTimeoutMs,
  });
  await page.waitForTimeout(500);
  await saveShot(page, 'import-review');

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
