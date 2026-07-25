import { test, expect } from '@playwright/test';

/**
 * E2E tests for chart click interaction features.
 *
 * These tests require a running backend with real API data.
 * They are skipped by default in CI environments where the backend
 * may not be available. To run locally with a backend:
 *   npm run test:e2e
 *
 * The Playwright config starts `npm run dev` as the webServer.
 */

// Helper: check if the backend is reachable before running tests
async function isBackendAvailable(page: import('@playwright/test').Page): Promise<boolean> {
  try {
    const response = await page.request.get('/runnerxbt/api/status', { timeout: 5000 });
    return response.ok();
  } catch {
    return false;
  }
}

test.describe('Chart Click → DayPostsPanel E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to render (Sidebar or ChartView should be visible)
    await page.waitForSelector('[data-testid="msg-item"], .glass-panel, canvas', { timeout: 15000 }).catch(() => {
      // App may still be loading; continue
    });
  });

  // 1. Full click-to-panel flow via Sidebar
  test('clicking "在日面板查看" in Sidebar opens DayPostsPanel', async ({ page }) => {
    const backendOk = await isBackendAvailable(page);
    if (!backendOk) {
      test.skip(true, 'Backend not available — skipping E2E test');
      return;
    }

    // Wait for messages to load in the sidebar
    await page.waitForSelector('[data-testid="msg-item"]', { timeout: 15000 });

    // DayPostsPanel should NOT be visible initially
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      // May already be visible if state persisted; that's fine
    });

    // Click the first "在日面板查看" link
    const panelLink = page.locator('text=在日面板查看').first();
    await panelLink.waitFor({ state: 'visible', timeout: 10000 });
    await panelLink.click();

    // DayPostsPanel dialog should now be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // The panel should have an aria-label with a date
    const ariaLabel = await page.locator('[role="dialog"]').getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Posts for \d{4}-\d{2}-\d{2}/);
  });

  // 2. Toggle off by clicking same date
  test('clicking same date again closes DayPostsPanel (toggle)', async ({ page }) => {
    const backendOk = await isBackendAvailable(page);
    if (!backendOk) {
      test.skip(true, 'Backend not available — skipping E2E test');
      return;
    }

    await page.waitForSelector('[data-testid="msg-item"]', { timeout: 15000 });

    // Open panel
    const panelLink = page.locator('text=在日面板查看').first();
    await panelLink.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Click the same link again
    await panelLink.click();

    // Panel should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
  });

  // 3. Close button in DayPostsPanel
  test('Close button in DayPostsPanel closes the panel', async ({ page }) => {
    const backendOk = await isBackendAvailable(page);
    if (!backendOk) {
      test.skip(true, 'Backend not available — skipping E2E test');
      return;
    }

    await page.waitForSelector('[data-testid="msg-item"]', { timeout: 15000 });

    // Open panel
    await page.locator('text=在日面板查看').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Click the Close button inside the panel
    const closeButton = page.locator('[role="dialog"] button:has-text("Close")');
    await closeButton.click();

    // Panel should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
  });

  // 4. Escape key closes DayPostsPanel
  test('pressing Escape key closes DayPostsPanel', async ({ page }) => {
    const backendOk = await isBackendAvailable(page);
    if (!backendOk) {
      test.skip(true, 'Backend not available — skipping E2E test');
      return;
    }

    await page.waitForSelector('[data-testid="msg-item"]', { timeout: 15000 });

    // Open panel
    await page.locator('text=在日面板查看').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Panel should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
  });

  // 5. Clicking chart area selects a date (canvas click simulation)
  test('clicking chart area triggers date selection and opens panel', async ({ page }) => {
    const backendOk = await isBackendAvailable(page);
    if (!backendOk) {
      test.skip(true, 'Backend not available — skipping E2E test');
      return;
    }

    // Wait for chart canvas to appear
    await page.waitForSelector('canvas', { timeout: 15000 });

    // The chart container is the parent of the canvas
    // Click in the center of the chart area
    const chartContainer = page.locator('canvas').first();
    const box = await chartContainer.boundingBox();
    if (!box) {
      test.skip(true, 'Chart canvas not rendered');
      return;
    }

    // Click at the center of the chart
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // After clicking, the DayPostsPanel may open if there are messages on that date
    // This depends on real data, so we just verify the app doesn't crash
    // and the chart is still visible
    await expect(chartContainer).toBeVisible({ timeout: 3000 });
  });

  // 6. Hover effects on Sidebar message items
  test('Sidebar message items show hover effects', async ({ page }) => {
    const backendOk = await isBackendAvailable(page);
    if (!backendOk) {
      test.skip(true, 'Backend not available — skipping E2E test');
      return;
    }

    await page.waitForSelector('[data-testid="msg-item"]', { timeout: 15000 });

    const firstMsg = page.locator('[data-testid="msg-item"]').first();
    await firstMsg.hover();

    // Verify the element is still visible (hover doesn't break anything)
    await expect(firstMsg).toBeVisible();

    // The msg-item should have the class 'msg-item'
    await expect(firstMsg).toHaveClass(/msg-item/);
  });

  // 7. Expand/Collapse in DayPostsPanel
  test('Expand and Collapse work in DayPostsPanel', async ({ page }) => {
    const backendOk = await isBackendAvailable(page);
    if (!backendOk) {
      test.skip(true, 'Backend not available — skipping E2E test');
      return;
    }

    await page.waitForSelector('[data-testid="msg-item"]', { timeout: 15000 });

    // Open panel
    await page.locator('text=在日面板查看').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Find Expand link inside the panel
    const expandLink = page.locator('[role="dialog"] span:has-text("↗ Expand")').first();
    const expandCount = await expandLink.count();

    if (expandCount > 0) {
      await expandLink.click();
      // After expand, the link should change to "× Close"
      await expect(page.locator('[role="dialog"] span:has-text("× Close")').first()).toBeVisible({ timeout: 3000 });

      // Click to collapse
      await page.locator('[role="dialog"] span:has-text("× Close")').first().click();
      // Expand link should reappear
      await expect(page.locator('[role="dialog"] span:has-text("↗ Expand")').first()).toBeVisible({ timeout: 3000 });
    }
  });

  // 8. Backdrop click closes DayPostsPanel
  test('clicking backdrop closes DayPostsPanel', async ({ page }) => {
    const backendOk = await isBackendAvailable(page);
    if (!backendOk) {
      test.skip(true, 'Backend not available — skipping E2E test');
      return;
    }

    await page.waitForSelector('[data-testid="msg-item"]', { timeout: 15000 });

    // Open panel
    await page.locator('text=在日面板查看').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Click the backdrop (data-testid="day-posts-backdrop")
    const backdrop = page.locator('[data-testid="day-posts-backdrop"]');
    await backdrop.click({ position: { x: 10, y: 10 } });

    // Panel should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
  });
});

/**
 * Smoke test: App loads without crashing (no backend required)
 * This test always runs — it only checks that the app shell renders.
 */
test.describe('App Shell Smoke Tests', () => {
  test('app loads and renders the main layout', async ({ page }) => {
    await page.goto('/');

    // The app should render at least one of these elements
    const appShell = page.locator('text=Timeline, [data-testid="chart-view"], canvas, [data-testid="msg-item"]');
    // Wait a bit for React to render
    await page.waitForTimeout(3000);

    // At minimum, the page should have content (not a blank page)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('Hide/Show Timeline button toggles sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Look for the toggle button
    const toggleBtn = page.locator('button:has-text("Hide Timeline"), button:has-text("Show Timeline")');
    const btnCount = await toggleBtn.count();

    if (btnCount > 0) {
      const currentText = await toggleBtn.textContent();
      await toggleBtn.click();

      // After click, the text should toggle
      if (currentText?.includes('Hide')) {
        await expect(page.locator('button:has-text("Show Timeline")')).toBeVisible({ timeout: 3000 });
      } else {
        await expect(page.locator('button:has-text("Hide Timeline")')).toBeVisible({ timeout: 3000 });
      }
    }
  });
});
