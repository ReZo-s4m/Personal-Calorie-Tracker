import { expect, test } from '@playwright/test';

const API = process.env.API_URL ?? 'http://localhost:4000/api';

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, init);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} ${response.status}: ${text}`);
  }
  return data as { token?: string };
}

test.use({ channel: 'chrome' });

test.describe('Goal vs actual spider chart', () => {
  test('renders a Recharts radar web with logged vs target', async ({ page }) => {
    const today = todayKey();
    const { token } = await api('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `spider.e2e.${Date.now()}@example.com`,
        password: 'password123',
        displayName: 'Spider E2E',
      }),
    });

    await api('/goals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyCalories: 2000,
        proteinGrams: 120,
        carbGrams: 200,
        fatGrams: 60,
        effectiveFrom: today,
      }),
    });

    await api('/entries', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        foodName: 'Uneven plate',
        mealType: 'lunch',
        quantity: 1,
        unit: 'plate',
        calories: 1600,
        proteinGrams: 150,
        carbGrams: 80,
        fatGrams: 70,
        consumedOn: today,
      }),
    });

    await page.addInitScript((value) => {
      window.localStorage.setItem('calorie-tracker.token', value);
    }, token);

    await page.goto('/reports');
    await page.getByRole('button', { name: 'Today' }).click();

    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Goal vs actual' }) });
    await expect(card).toBeVisible();
    await expect(card.locator('.recharts-radar')).toHaveCount(2);

    const labels = await card.locator('.recharts-polar-angle-axis-tick').allTextContents();
    expect(labels).toEqual(['Calories', 'Protein', 'Fat', 'Carbs', 'Goal vs actual']);

    await expect(card.locator('.recharts-polar-grid-angle line')).toHaveCount(5);
    expect(await card.locator('.recharts-polar-grid-concentric-polygon').count()).toBeGreaterThanOrEqual(8);
    expect(await card.locator('.recharts-polygon').count()).toBeGreaterThanOrEqual(2);

    const series = await card.locator('.recharts-polygon').evaluateAll((nodes) =>
      nodes.map((node) => ({
        name: node.getAttribute('name'),
        opacity: Number(node.getAttribute('fill-opacity')),
        d: node.getAttribute('d') ?? '',
      })),
    );
    expect(series.some((item) => item.name === 'Logged' && item.opacity >= 0.15)).toBeTruthy();
    expect(series.some((item) => item.name === 'Target' && item.opacity >= 0.1)).toBeTruthy();
    expect(series[0]?.d).not.toEqual(series[1]?.d);

    await expect(card.locator('.spider-logged-label')).toHaveCount(5);
    await expect(card.locator('.spider-logged-label')).toContainText(['1,600 kcal', '150 g', '70 g', '80 g']);
    await expect(card.locator('.spider-percent-label')).toHaveCount(5);
    await expect(card.locator('.spider-percent-label')).toContainText(['80%', '125%', '40%', '90%']);
    await expect(card.locator('.spider-target-label')).toHaveCount(5);
    await expect(card.locator('.spider-target-label')).toContainText(['2,000 kcal', '120 g', '60 g', '200 g', '100%']);

    await expect(card.getByRole('cell', { name: 'Goal vs actual' })).toBeVisible();
    await expect(card.getByText('Target · goal amount at 100%')).toBeVisible();

    await card.screenshot({ path: 'e2e/screenshots/goal-spider.png' });

    await card.locator('.spider-logged-label').filter({ hasText: '1,600 kcal' }).hover({ force: true });
    await expect(page.locator('.recharts-tooltip-wrapper').filter({ hasText: 'Logged' })).toBeVisible();
    await expect(page.locator('.recharts-tooltip-wrapper').filter({ hasText: 'Target' })).toBeVisible();
    await card.screenshot({ path: 'e2e/screenshots/goal-spider-tooltip.png' });
  });

  test('keeps two distinct webs when logged is far over target', async ({ page }) => {
    const today = todayKey();
    const { token } = await api('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `spider.over.${Date.now()}@example.com`,
        password: 'password123',
        displayName: 'Overshoot E2E',
      }),
    });

    await api('/goals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyCalories: 2000,
        proteinGrams: 40,
        carbGrams: 50,
        fatGrams: 20,
        effectiveFrom: today,
      }),
    });

    await api('/entries', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        foodName: 'Heavy plate',
        mealType: 'dinner',
        quantity: 1,
        unit: 'plate',
        calories: 2500,
        proteinGrams: 220,
        carbGrams: 80,
        fatGrams: 140,
        consumedOn: today,
      }),
    });

    await page.addInitScript((value) => {
      window.localStorage.setItem('calorie-tracker.token', value);
    }, token);

    await page.goto('/reports');
    await page.getByRole('button', { name: 'Today' }).click();

    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Goal vs actual' }) });
    await expect(card.getByRole('cell', { name: 'Goal vs actual' })).toBeVisible();
    await expect(card.getByText('Complete').first()).toBeVisible();
    await expect(card.getByText('Gray labels are the goal on the 100% pentagon.')).toBeVisible();
    await expect(card.getByText('The web is drawn to 200%')).toBeVisible();

    const paths = await card.locator('.recharts-polygon').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('d') ?? ''),
    );
    expect(paths.length).toBeGreaterThanOrEqual(2);
    expect(paths[0]).not.toEqual(paths[1]);

    await expect(card.locator('.spider-logged-label')).toContainText(['2,500 kcal', '220 g', '140 g']);
    await expect(card.locator('.spider-percent-label')).toHaveCount(5);
    await expect(card.locator('.spider-percent-label')).toContainText(['125%', '550%', '700%', '160%']);
    await expect(card.locator('.spider-target-label')).toContainText(['2,000 kcal', '40 g', '20 g', '50 g', '100%']);

    await card.screenshot({ path: 'e2e/screenshots/goal-spider-overshoot.png' });
  });

  test('keeps the no-goal empty state', async ({ page }) => {
    const { token } = await api('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `spider.empty.${Date.now()}@example.com`,
        password: 'password123',
        displayName: 'No Goal E2E',
      }),
    });

    await page.addInitScript((value) => {
      window.localStorage.setItem('calorie-tracker.token', value);
    }, token);

    await page.goto('/reports');
    await expect(
      page.getByText('No goal covered this range, so there is nothing to compare against.'),
    ).toBeVisible();
    await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Goal vs actual' }) }).locator('.recharts-radar')).toHaveCount(0);
  });
});
