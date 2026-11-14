const { chromium, devices } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const url = 'file://' + path.resolve(__dirname, '../index.html');
fs.mkdirSync('test-results', { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  let failures = 0;
  for (const [name, options] of [
    ['desktop', { viewport: { width: 1280, height: 800 } }],
    ['mobile', { ...devices['iPhone 13'] }],
    ['android', { ...devices['Pixel 7'] }],
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(url);
      assert.equal(await page.locator('body').evaluate(e => e.classList.contains('playing')), false);
      assert.equal(await page.locator('.settings').isVisible(), false, 'home settings should be hidden');
      await page.locator('[data-game="sudoku"]').click();
      assert.equal(await page.locator('.sudoku-picker').count(), 1, 'one sudoku picker');
      assert.equal(await page.locator('.sudoku-picker').isVisible(), true);
      await page.locator('.sudoku-picker button.primary').click();
      assert.equal(await page.locator('body.playing').count(), 1);
      assert.equal(await page.locator('.sudoku-picker').count(), 0);
      assert.equal(await page.locator('.sudoku .cell').count(), 81, '81 sudoku cells');
      await page.locator('#changeDifficultyNav').click();
      assert.equal(await page.locator('.sudoku-picker').count(), 1);
      await page.locator('#changeDifficultyNav').click();
      assert.equal(await page.locator('.sudoku-picker').count(), 1, 'no duplicate dialogs');
      await page.locator('.sudoku-picker button').last().click();
      await page.locator('#closeGameNav').click();
      await page.locator('[data-game="maze"]').click();
      assert.equal(await page.locator('.sudoku-picker').count(), 1, 'maze picker');
      await page.locator('.sudoku-picker select').selectOption('easy');
      await page.locator('.sudoku-picker button.primary').click();
      assert.equal(await page.locator('body.playing').count(), 1);
      assert.equal(await page.evaluate(() => localStorage.getItem('arenaDifficulty_maze')), 'easy');
      assert.equal(errors.length, 0, 'JS errors: ' + errors.join('; '));
      console.log('PASS', name);
    } catch (err) {
      failures++;
      console.error('FAIL', name, err.stack);
      await page.screenshot({ path: 'test-results/' + name + '.png', fullPage: true }).catch(() => {});
    } finally { await context.close(); }
  }
  await browser.close();
  if (failures) process.exitCode = 1;
})().catch(err => { console.error(err); process.exitCode = 1; });
