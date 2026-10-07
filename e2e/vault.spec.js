import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function signIn(page) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('browser@example.com');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTestPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your files', exact: true })).toBeVisible();
}

test('upload, search, versions, share, trash, restore, and sign out', async ({ page, browser }) => {
  await signIn(page);
  await page.locator('input[type=file]').setInputFiles({
    name: 'browser-notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('first version'),
  });
  await expect(page.getByRole('button', { name: 'browser-notes.txt', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Details browser-notes.txt', exact: true }).click();
  await page.getByLabel('Tags', { exact: true }).fill('work, important');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Details browser-notes.txt', exact: true }).click();
  await page.getByRole('button', { name: 'Versions', exact: true }).click();
  await page
    .getByRole('dialog')
    .locator('input[type=file]')
    .setInputFiles({
      name: 'browser-notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('second version'),
    });
  await expect(page.getByText('v2 Current version')).toBeVisible();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.getByLabel('Optional password', { exact: true }).fill('SharePassword123!');
  await page.getByLabel('Download limit', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Create link', exact: true }).click();
  const shared = await page.getByLabel('Share link').inputValue();
  expect(shared).toContain('/share/');
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await visitor.goto(shared);
  await visitor.getByLabel('Optional password', { exact: true }).fill('SharePassword123!');
  const [download] = await Promise.all([
    visitor.waitForEvent('download'),
    visitor.getByRole('button', { name: 'Download file', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('browser-notes.txt');
  expect(await readFile(await download.path(), 'utf8')).toBe('second version');
  await visitor.getByRole('button', { name: 'Download file', exact: true }).click();
  await expect(visitor.getByRole('alert')).toContainText('download limit reached');
  await visitorContext.close();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByLabel('Search files', { exact: true }).fill('does-not-exist');
  await expect(page.getByRole('heading', { name: 'No results', exact: true })).toBeVisible();
  await page.getByLabel('Search files', { exact: true }).fill('browser-notes');
  await page.getByRole('button', { name: 'Move to trash browser-notes.txt', exact: true }).click();
  await page.getByRole('link', { name: 'Trash', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restore browser-notes.txt', exact: true })).toBeVisible();
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/restore') && r.status() === 200),
    page.getByRole('button', { name: 'Restore browser-notes.txt', exact: true }).click(),
  ]);
  await page.getByRole('link', { name: 'All files', exact: true }).click();
  await expect(page.getByRole('button', { name: 'browser-notes.txt', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your files', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download browser-notes.txt', exact: true })).toBeVisible();
  await page.getByLabel('Search files', { exact: true }).fill('');
  await expect(page.getByRole('button', { name: 'Getting started.md', exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'Your files', exact: true }).click();
  const notice = page.getByRole('button', { name: 'Dismiss notification', exact: true });
  if (await notice.isVisible()) await notice.click();
  await page.screenshot({ path: 'test-results/vault-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
});

test('mobile navigation, theme, Romanian labels, and sessions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await expect(page.getByLabel('Folder', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Language').selectOption('ro');
  await expect(page.getByRole('heading', { name: 'Fișierele tale', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Setări', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sesiuni active', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/vault-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Deconectare', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bine ai revenit', exact: true })).toBeVisible();
});
