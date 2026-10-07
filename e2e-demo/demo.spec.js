import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const observed = new WeakMap();
test.beforeEach(async ({ page }) => {
  const problems = [];
  observed.set(page, problems);
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/'))
      problems.push(`Unexpected API request: ${request.url()}`);
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Your files', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Project brief.md', exact: true })).toBeVisible();
});
test.afterEach(async ({ page }) => {
  expect(observed.get(page)).toEqual([]);
});

const nav = (page, name) => page.locator('.sidebar nav').getByRole('link', { name, exact: true }).click();
const details = (page, name) => page.getByRole('button', { name: `Details ${name}`, exact: true }).click();

test('organize files, restore trash, and reset a tab without a backend', async ({ page }) => {
  await page.getByRole('button', { name: 'New folder', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Demo project');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await details(page, 'Project brief.md');
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Project plan.md');
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Folder', exact: true })
    .selectOption({ label: 'Demo project' });
  await page.getByLabel('Tags', { exact: true }).fill('important, planning');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByLabel('Search files', { exact: true }).fill('Project plan');
  await expect(page.getByRole('button', { name: 'Project plan.md', exact: true })).toBeVisible();
  await page.getByLabel('Filter by tag').fill('important');
  await expect(page.locator('.table-footer')).toContainText('1 files');
  await page.getByLabel('Move to trash Project plan.md', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Project plan.md', exact: true })).toBeHidden();
  await nav(page, 'Trash');
  await page.getByLabel('Search files', { exact: true }).clear();
  await page.getByLabel('Filter by tag').clear();
  await page.getByLabel('Restore Project plan.md', { exact: true }).click();
  await nav(page, 'All files');
  await expect(page.getByRole('button', { name: 'Project plan.md', exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Project brief.md', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Project plan.md', exact: true })).toBeHidden();
});

test('upload, cancel, version restore, and download use local bytes', async ({ page }) => {
  const input = page.locator('.dropzone input[type=file]');
  await input.setInputFiles({
    name: 'local-notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('first version'),
  });
  await expect(page.getByRole('button', { name: 'local-notes.txt', exact: true })).toBeVisible();
  await details(page, 'local-notes.txt');
  await page.getByRole('button', { name: 'Versions', exact: true }).click();
  await page
    .getByRole('dialog')
    .locator('input[type=file]')
    .setInputFiles({
      name: 'local-notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('second version'),
    });
  await expect(page.getByText('v2 Current version')).toBeVisible();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByText('v1 Current version')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const promise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download local-notes.txt', exact: true }).click();
  const download = await promise;
  expect(await readFile(await download.path(), 'utf8')).toBe('first version');
  await input.setInputFiles({ name: 'cancel-me.txt', mimeType: 'text/plain', buffer: Buffer.from('cancel') });
  await page.getByLabel('Cancel cancel-me.txt', { exact: true }).click();
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'cancel-me.txt', exact: true })).toBeHidden();
  await nav(page, 'Activity');
  await page.getByLabel('Event type').selectOption('file.downloaded');
  await expect(page.locator('tbody')).toContainText('local-notes.txt');
});

test('local sharing preview handles a code and a one-download limit', async ({ page, context }) => {
  await details(page, 'Project brief.md');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.getByLabel('Require demo code: 123456').check();
  await page.getByLabel('Download limit').fill('1');
  await page.getByRole('button', { name: 'Create preview link', exact: true }).click();
  const link = await page.getByLabel('Share link').inputValue();
  expect(link).toContain('/Secure-Vault-Frontend/#/share/');
  const otherTab = await context.newPage();
  await otherTab.goto(link);
  await otherTab.getByRole('button', { name: 'Download file', exact: true }).click();
  await expect(otherTab.getByRole('alert')).toContainText('another tab');
  await otherTab.close();
  await page.getByRole('link', { name: 'Open local preview' }).click();
  await page.getByRole('button', { name: 'Download file', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('123456');
  await page.getByLabel('Demo code (if required)').fill('123456');
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file', exact: true }).click();
  expect((await promise).suggestedFilename()).toBe('Project brief.md');
  await page.getByRole('button', { name: 'Download file', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('expired');
  await page.getByRole('link', { name: 'Back to demo' }).click();
  await expect(page.getByRole('heading', { name: 'Your files', exact: true })).toBeVisible();
});

test('image preview, settings, and refresh work at the Pages subpath', async ({ page }) => {
  await details(page, 'Workspace preview.png');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = page.getByRole('img', { name: 'Workspace preview.png' });
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await nav(page, 'Settings');
  await page.getByLabel('Full name').fill('Demo visitor');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.sidebar-profile')).toContainText('Demo visitor');
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Revoke', exact: true }).click();
  await expect(page.getByText('Sample mobile browser')).toBeHidden();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByLabel('Full name')).toHaveValue('Alex Morgan');
});

test('mobile and dark layouts stay usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Reset demo' })).toBeVisible();
  await page.getByLabel('Dark theme', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/demo-mobile.png', fullPage: true });
  await nav(page, 'Trash');
  await page.getByLabel('Restore Archived checklist.txt', { exact: true }).click();
  await nav(page, 'All files');
  await expect(page.getByRole('button', { name: 'Archived checklist.txt', exact: true })).toBeVisible();
  await expect(page.locator('.table-footer')).toContainText('7 files');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Light theme', { exact: true }).click();
  await page.screenshot({ path: 'test-results/demo-desktop.png', fullPage: true });
});
