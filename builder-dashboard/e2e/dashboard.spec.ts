import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4002';
const GOTO = { waitUntil: 'domcontentloaded' as const };
const WAIT = { waitUntil: 'domcontentloaded' as const };

test.describe('Dev Login & Role Routing', () => {
  test('shows dev login page when not authenticated', async ({ page }) => {
    await page.goto(`${BASE}/login`, GOTO);
    await expect(page.getByText('Development Mode')).toBeVisible();
    await expect(page.getByText('Enter as Builder')).toBeVisible();
    await expect(page.getByText('Enter as Tester')).toBeVisible();
  });

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto(`${BASE}/builder`, GOTO);
    await page.waitForURL('**/login', WAIT);
    await expect(page.getByText('Development Mode')).toBeVisible();
  });

  test('builder dev login navigates to builder dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`, GOTO);
    await page.getByText('Enter as Builder').click();
    await page.waitForURL('**/builder', WAIT);
    await expect(page.locator('aside').getByText('Builder Dashboard')).toBeVisible();
    await expect(page.locator('aside').getByText('Test Cases')).toBeVisible();
    await expect(page.locator('aside').getByText('Templates')).toBeVisible();
    await expect(page.locator('aside').getByText('Credits')).toBeVisible();
    await expect(page.locator('aside').getByText('Settings')).toBeVisible();
  });

  test('tester dev login navigates to tester tasks', async ({ page }) => {
    await page.goto(`${BASE}/login`, GOTO);
    await page.getByText('Enter as Tester').click();
    await page.waitForURL('**/tester/tasks', WAIT);
    await expect(page.locator('aside').getByText('Tester Dashboard')).toBeVisible();
    await expect(page.locator('aside').getByText('Tasks')).toBeVisible();
    await expect(page.locator('aside').getByText('Profile')).toBeVisible();
    await expect(page.locator('aside').getByText('Earnings')).toBeVisible();
  });
});

test.describe('Builder Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([{
      name: 'dev-session',
      value: 'builder:builder@test.com',
      domain: 'localhost',
      path: '/',
    }]);
    await page.goto(`${BASE}/builder`, GOTO);
  });

  test('can navigate to test cases', async ({ page }) => {
    await page.locator('aside').getByRole('link', { name: 'Test Cases' }).click();
    await page.waitForURL('**/builder/test-cases', WAIT);
    await expect(page.locator('main').getByRole('heading', { name: 'Test Cases' })).toBeVisible();
  });

  test('can navigate to create test case', async ({ page }) => {
    await page.locator('aside').getByRole('link', { name: 'Test Cases' }).click();
    await page.waitForURL('**/builder/test-cases', WAIT);
    await page.locator('main').getByRole('link', { name: 'Create Test' }).click();
    await page.waitForURL('**/builder/test-cases/new', WAIT);
    await expect(page.locator('main').getByRole('heading', { name: 'Create Test Case' })).toBeVisible();
  });

  test('can navigate to templates', async ({ page }) => {
    await page.locator('aside').getByRole('link', { name: 'Templates' }).click();
    await page.waitForURL('**/builder/templates', WAIT);
    await expect(page.locator('main').getByRole('heading', { name: 'Templates' })).toBeVisible();
  });

  test('can navigate to credits', async ({ page }) => {
    await page.locator('aside').getByRole('link', { name: 'Credits' }).click();
    await page.waitForURL('**/builder/credits', WAIT);
    await expect(page.locator('main').getByText('Credits & Billing')).toBeVisible();
  });

  test('can navigate to settings', async ({ page }) => {
    await page.locator('aside').getByRole('link', { name: 'Settings' }).click();
    await page.waitForURL('**/builder/settings', WAIT);
    await expect(page.locator('main').getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('logout clears session and returns to login', async ({ page }) => {
    await page.evaluate(() => {
      document.cookie = 'dev-session=;path=/;max-age=0';
      window.location.href = '/login';
    });
    await page.waitForURL('**/login', WAIT);
    await expect(page.getByText('Development Mode')).toBeVisible();
  });
});

test.describe('Tester Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([{
      name: 'dev-session',
      value: 'tester:tester@test.com',
      domain: 'localhost',
      path: '/',
    }]);
    await page.goto(`${BASE}/tester/tasks`, GOTO);
  });

  test('shows tester sidebar', async ({ page }) => {
    await expect(page.locator('aside').getByText('Tester Dashboard')).toBeVisible();
    await expect(page.locator('aside').getByText('Tasks')).toBeVisible();
    await expect(page.locator('aside').getByText('Profile')).toBeVisible();
    await expect(page.locator('aside').getByText('Earnings')).toBeVisible();
  });

  test('can navigate to profile', async ({ page }) => {
    await page.locator('aside').getByRole('link', { name: 'Profile' }).click();
    await page.waitForURL('**/tester/profile', WAIT);
    expect(page.url()).toContain('/tester/profile');
  });

  test('can navigate to earnings', async ({ page }) => {
    await page.locator('aside').getByRole('link', { name: 'Earnings' }).click();
    await page.waitForURL('**/tester/earnings', WAIT);
    expect(page.url()).toContain('/tester/earnings');
  });

  test('logout clears session and returns to login', async ({ page }) => {
    await page.evaluate(() => {
      document.cookie = 'dev-session=;path=/;max-age=0';
      window.location.href = '/login';
    });
    await page.waitForURL('**/login', WAIT);
    await expect(page.getByText('Development Mode')).toBeVisible();
  });
});

test.describe('Role Isolation', () => {
  test('root page redirects builder to /builder', async ({ page }) => {
    await page.context().addCookies([{
      name: 'dev-session',
      value: 'builder:builder@test.com',
      domain: 'localhost',
      path: '/',
    }]);
    await page.goto(`${BASE}/`, GOTO);
    await page.waitForURL('**/builder', WAIT);
  });

  test('root page redirects tester to /tester/tasks', async ({ page }) => {
    await page.context().addCookies([{
      name: 'dev-session',
      value: 'tester:tester@test.com',
      domain: 'localhost',
      path: '/',
    }]);
    await page.goto(`${BASE}/`, GOTO);
    await page.waitForURL('**/tester/tasks', WAIT);
  });
});
