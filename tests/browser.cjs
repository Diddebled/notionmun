const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ExcelJS = require('exceljs');

const base = process.env.NOTIONMUN_URL || process.env.MOTION_URL || 'http://127.0.0.1:8001';

async function main() {
  await fs.mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge', timeout: 30000 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => console.log('REQUEST FAILED', request.url(), request.failure()));
  page.on('dialog', (dialog) => dialog.accept());
  const go = async (route) => {
    await page.goto(base + route);
    await page.locator('.app-shell').first().waitFor();
    await page.waitForFunction(() => !document.querySelector('.loading-state'));
  };
  try {
    await go('/');
    await page.getByRole('heading', { name: 'United Nations Security Council', exact: true }).waitFor();
    assert.equal(await page.locator('.workspace-home').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(247, 249, 248)');
    assert.ok((await page.title()).includes('NotionMUN.com'));
    await page.getByRole('link', { name: 'NotionMUN.com home' }).first().waitFor();
    await page.locator('.venue-photo img').waitFor();
    assert.ok((await page.locator('.venue-photo').innerText()).includes('CC BY 4.0'));
    assert.equal(await page.locator('.notebook-signoff p').innerText(), 'From Motion To Notion');
    assert.equal(await page.locator('.sidebar-bottom p').innerText(), 'From Motion To Notion');
    assert.equal(await page.locator('.brand-quote blockquote').innerText(), '"I love notionMUN"');
    assert.ok((await page.locator('.brand-quote figcaption').innerText()).includes('- Paul Taechaaukarakul'));
    assert.equal(await page.locator('.brand-quote time').innerText(), '11/4/2026');
    assert.equal(await page.locator('.brand-quote time').getAttribute('datetime'), '2026-11-04');
    await page.getByLabel("Chair's notes").fill('Invite smaller delegations into the next caucus.');
    await page.reload();
    await page.getByLabel("Chair's notes").waitFor();
    assert.equal(await page.getByLabel("Chair's notes").inputValue(), 'Invite smaller delegations into the next caucus.');
    const originalState = await context.storageState();
    console.log('PASS workspace and stylesheet');

    await page.getByRole('link', { name: 'Open speakers list' }).click();
    await page.getByRole('heading', { name: 'United States', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.waitForTimeout(1300);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Next speaker', exact: true }).click();
    await page.getByRole('heading', { name: 'United Kingdom', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Undo queue change' }).click();
    await page.getByRole('heading', { name: 'United States', exact: true }).waitFor();
    await page.getByPlaceholder('Country...').fill('Brazil');
    await page.getByPlaceholder('Country...').press('Enter');
    await page.getByText('Brazil', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Brazil', { exact: true }).waitFor();
    console.log('PASS timer, next, undo, queue persistence');

    await go('/rollcall');
    const row = page.locator('.delegate-roster-row').first();
    await row.getByRole('button', { name: 'Absent', exact: true }).click();
    assert.equal(await row.getByRole('button', { name: 'Absent', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.reload();
    await page.locator('.delegate-roster-row').first().waitFor();
    assert.equal(await page.locator('.delegate-roster-row').first().getByRole('button', { name: 'Absent', exact: true }).getAttribute('aria-pressed'), 'true');
    console.log('PASS attendance persistence');

    await go('/motion');
    await page.locator('textarea').fill('Brazil motions for a moderated caucus of 10 minutes with 60 seconds speaking time on regional security');
    await page.locator('textarea').press('Enter');
    await page.getByRole('heading', { name: 'Moderated Caucus', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Voting', exact: true }).click();
    await page.getByLabel('Majority rule').selectOption('two-thirds');
    await page.getByRole('button', { name: 'Increase For votes', exact: true }).click();
    await page.reload();
    await page.getByRole('heading', { name: 'Moderated Caucus', exact: true }).waitFor();
    console.log('PASS motion parsing, logging and voting');

    await go('/resolutions');
    await page.getByLabel('Resolution title', { exact: true }).fill('Draft resolution 1.1');
    await page.getByLabel('Sponsors', { exact: true }).fill('Brazil, Ghana, Japan');
    await page.getByLabel('Resolution text', { exact: true }).fill('1. Calls for transparent reporting;\n2. Encourages regional coordination.');
    await page.getByRole('button', { name: 'Save resolution' }).click();
    await page.getByRole('status').filter({ hasText: 'Resolution saved.' }).waitFor();
    await page.reload();
    await page.getByLabel('Resolution title', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Resolution title', { exact: true }).inputValue(), 'Draft resolution 1.1');
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await page.getByRole('dialog', { name: 'Resolution display' }).waitFor();
    await page.screenshot({ path: 'test-results/presentation.png' });
    await page.getByRole('button', { name: 'Close dialog' }).click();
    const [textDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download resolution' }).click()]);
    assert.ok(textDownload.suggestedFilename().endsWith('.txt'));
    console.log('PASS resolution create, save, reload, present and download');

    await go('/settings');
    await page.getByRole('button', { name: 'Black', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-app-theme'), 'dark');
    await page.getByRole('switch', { name: 'Reduced motion', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-app-reduced-motion'), 'true');
    await page.getByRole('button', { name: 'White', exact: true }).click();
    console.log('PASS themes and reduced motion');

    await go('/');
    const [backupDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Backup', exact: true }).click()]);
    const backup = JSON.parse(await fs.readFile(await backupDownload.path(), 'utf8'));
    assert.equal(backup.format, 'motion-workspace');
    assert.equal(Object.values(backup.conference.committees)[0].resolutions.length, 1);
    await page.getByLabel("Chair's notes").fill('Temporary note after the backup.');
    await page.getByLabel('Restore workspace backup').setInputFiles({ name: 'same-committee.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.waitForFunction(() => document.querySelector('[aria-label="Chair\'s notes"]')?.value === 'Invite smaller delegations into the next caucus.');
    await page.getByLabel('Import conference workbook').setInputFiles({ name: 'Roster.csv', mimeType: 'text/csv', buffer: Buffer.from('Country,Delegate\nBrazil,Ana\nFrance,Jean') });
    await page.getByRole('dialog', { name: 'Choose a committee' }).locator('.picker-list button').first().click();
    assert.equal(await page.getByRole('meter', { name: 'Attendance', exact: true }).getAttribute('aria-valuemax'), '2');
    console.log('PASS CSV import');

    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('DISEC').addRows([['Country', 'Delegate'], ['Brazil', 'Ana']]);
    workbook.addWorksheet('SOCHUM').addRows([['Country', 'Delegate'], ['Japan', 'Hana']]);
    await page.getByLabel('Import conference workbook').setInputFiles({ name: 'Conference.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
    await page.getByRole('dialog', { name: 'Choose a committee' }).locator('.picker-list button').first().waitFor();
    assert.equal(await page.getByRole('dialog', { name: 'Choose a committee' }).locator('.picker-list button').count(), 2);
    await page.getByRole('dialog', { name: 'Choose a committee' }).locator('.picker-list button').first().click();
    await page.getByLabel('Active committee').selectOption('SOCHUM');
    await page.getByRole('heading', { name: 'SOCHUM', exact: true }).waitFor();
    await page.getByLabel('Restore workspace backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.getByRole('status').filter({ hasText: 'Workspace restored.' }).waitFor();
    assert.equal(await page.getByLabel("Chair's notes").inputValue(), 'Invite smaller delegations into the next caucus.');
    console.log('PASS XLSX committee import and backup restore');

    await go('/stats');
    const [report] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
    assert.ok((await fs.readFile(await report.path(), 'utf8')).includes('Speaking time (seconds)'));
    console.log('PASS report export');

    for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
      await page.setViewportSize(viewport);
      if (viewport.width < 760) {
        await go('/');
        await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
        await page.getByRole('dialog').getByRole('link', { name: 'Settings', exact: true }).click();
        await page.waitForURL('**/settings');
        assert.equal(await page.locator('dialog').count(), 0);
      }
      for (const route of ['/', '/session', '/rollcall', '/motion', '/vote', '/timer', '/resolutions', '/stats', '/settings', '/cloud']) {
        await go(route);
        const size = await page.evaluate(() => ({ width: innerWidth, doc: document.documentElement.scrollWidth }));
        assert.ok(size.doc <= size.width + 1, `${route} overflows at ${viewport.width}: ${size.doc}`);
        if (route === '/') {
          assert.equal(await page.locator('.notebook-signoff p').innerText(), 'From Motion To Notion');
          assert.equal(await page.locator('.brand-quote blockquote').innerText(), '"I love notionMUN"');
        }
        await page.waitForFunction(() => [...document.images].every((img) => img.complete));
        const broken = await page.locator('img').evaluateAll((imgs) => imgs.filter((img) => img.naturalWidth === 0).map((img) => img.src));
        assert.deepEqual(broken, [], `${route} has broken images`);
        if (['/', '/session', '/resolutions', '/vote'].includes(route)) await page.screenshot({ path: `test-results/${viewport.width}-${route.slice(1) || 'home'}.png`, fullPage: true });
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS desktop/mobile route layouts, assets and no page errors');

    await page.getByRole('contentinfo').getByRole('link', { name: 'Photo credits', exact: true }).click();
    await page.getByRole('heading', { name: 'Photography credits', exact: true }).waitFor();
    await page.waitForFunction(() => [...document.images].every((img) => img.complete));
    assert.equal(await page.locator('.photo-credit-record img').count(), 2);
    assert.deepEqual(await page.locator('.photo-credit-record img').evaluateAll((imgs) => imgs.filter((img) => img.naturalWidth === 0).map((img) => img.src)), []);
    assert.equal(await page.locator('#image-credits a').filter({ hasText: 'CC BY 4.0' }).count(), 2);
    assert.ok(await page.getByRole('heading', { name: 'Photography credits', exact: true }).evaluate((el) => el.getBoundingClientRect().top >= 0 && el.getBoundingClientRect().top < innerHeight));
    console.log('PASS visible photo credits, license links and reference photographs');

    await page.getByRole('contentinfo').getByRole('link', { name: 'Flag credits', exact: true }).click();
    await page.getByRole('heading', { name: 'Flag artwork credits', exact: true }).waitFor();
    await page.waitForFunction(() => [...document.images].every((img) => img.complete));
    assert.equal(await page.locator('.flag-credit-examples img').count(), 6);
    assert.deepEqual(await page.locator('.flag-credit-examples img').evaluateAll((imgs) => imgs.filter((img) => img.naturalWidth === 0).map((img) => img.src)), []);
    assert.ok((await page.locator('#flag-credits').innerText()).includes('Copyright (c) 2021 Yummygum'));
    console.log('PASS flag credits, rendered upstream flags and license notice');

    const reopened = await browser.newContext({ storageState: await context.storageState() });
    const restored = await reopened.newPage();
    await restored.goto(base + '/');
    await restored.getByRole('heading', { name: 'United Nations Security Council', exact: true }).waitFor();
    assert.equal(await restored.getByLabel('Active committee').inputValue(), backup.conference.activeCommittee);
    await reopened.close();
    const fresh = await browser.newContext({ storageState: originalState });
    const home = await fresh.newPage();
    await home.goto(base + '/');
    await home.getByRole('heading', { name: 'United Nations Security Council', exact: true }).waitFor();
    await fresh.close();
    console.log('PASS restore in a new browser session');
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
