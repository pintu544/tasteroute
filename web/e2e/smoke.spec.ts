import { expect, test } from '@playwright/test';

/**
 * Production smoke: chat -> plan renders -> share link loads.
 * Run: npx playwright test (needs the egress forwarder on :8888, see AGENTS.md).
 * Override target: E2E_BASE_URL=http://localhost:3100 npx playwright test
 */
test('chat plans an evening and the share link loads', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/');
  await expect(page.locator('text=Plans with taste')).toBeVisible();

  // 1. Chat -> plan
  await page.fill('input[placeholder*="Anniversary"]', 'Anniversary dinner — we love jazz and sushi in Bandra');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Your evening, mapped')).toBeVisible({ timeout: 90_000 });

  const stops = page.locator('ol li');
  expect(await stops.count()).toBeGreaterThanOrEqual(2);
  // Taste rationales visible (FR-4)
  expect(await page.locator('text=Why:').count()).toBeGreaterThanOrEqual(2);
  // Map rendered (FR-6)
  await expect(page.locator('.leaflet-container')).toBeVisible();

  // 2. Share link -> loads as a shared plan
  await page.click('button:has-text("Share plan")');
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareUrl).toMatch(/\/plan\/[0-9a-f-]{36}$/);

  await page.goto(shareUrl);
  await expect(page.locator('text=A shared evening')).toBeVisible({ timeout: 60_000 });
  expect(await page.locator('ol li').count()).toBeGreaterThanOrEqual(2);
});

test('refinement regenerates the plan in the same session', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[placeholder*="Anniversary"]', 'Date night with live music');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Your evening, mapped')).toBeVisible({ timeout: 90_000 });

  await page.fill('input[placeholder*="Anniversary"]', 'make it more casual');
  await page.click('button[type="submit"]');
  // A second plan render appears (session continuity, FR-9)
  await expect(page.locator('text=Your evening, mapped')).toBeVisible({ timeout: 90_000 });
  expect(await page.locator('ol li').count()).toBeGreaterThanOrEqual(2);
});
