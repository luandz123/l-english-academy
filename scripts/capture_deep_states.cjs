const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8082';
const PROJECT_DIR = '/home/luan/Desktop/l-english-academy/screenshots';
const ARTIFACT_DIR = '/home/luan/.gemini/antigravity-ide/brain/1a8d5e78-e91f-429a-8263-c79149ce4b5f/screenshots';

async function saveScreenshot(page, filename, options = {}) {
  const pPath = path.join(PROJECT_DIR, filename);
  const aPath = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: pPath, ...options });
  fs.copyFileSync(pPath, aPath);
  console.log('Saved deep screenshot:', filename);
}

async function run() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();

  // 1. Authenticate
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin@lenglish.vn');
  await page.fill('input[type="password"]', 'luan123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // 2. Full Test Active Exam Room (after audio check)
  console.log('Navigating to full test exam...');
  await page.goto(BASE_URL + '/courses/13/fulltest/74', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const startBtn = await page.locator('button:has-text("BẮT ĐẦU LÀM BÀI")').first();
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(1500);
    // Click "Âm thanh tốt, bắt đầu ngay!"
    const audioOkBtn = await page.locator('button:has-text("Âm thanh tốt"), button:has-text("bắt đầu ngay")').first();
    if (await audioOkBtn.isVisible()) {
      await audioOkBtn.click();
      await page.waitForTimeout(3000);
      await saveScreenshot(page, '15c_phong_thi_fulltest_dang_lam_bai_that.png');
    }
  }

  // 3. Part 2 Coach Stepper
  console.log('Navigating to Part 2 Coach cluster direct...');
  await page.goto(BASE_URL + '/part2-coach/dictation-part2-unit1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await saveScreenshot(page, '16c_part2_coach_stepper_luyen_tap.png');

  // 4. Word Shooter Active Game
  console.log('Navigating to Word Shooter...');
  await page.goto(BASE_URL + '/games/word-shooter', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // Close tutorial dialog if open
  const closeBtn = await page.locator('button:has-text("Bỏ qua"), button:has-text("Đóng"), [aria-label="Close"], button:has-text("Chơi ngay"), button:has-text("Bắt đầu")').first();
  if (await closeBtn.isVisible()) {
    try { await closeBtn.click(); await page.waitForTimeout(1500); } catch(e){}
  }
  await saveScreenshot(page, '07c_game_word_shooter_man_choi.png');

  // 5. Word Defense Active Game
  console.log('Navigating to Word Defense...');
  await page.goto(BASE_URL + '/games/word-defense', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const startDefenseBtn = await page.locator('button:has-text("Bắt đầu"), button:has-text("Chơi ngay")').first();
  if (await startDefenseBtn.isVisible()) {
    try { await startDefenseBtn.click(); await page.waitForTimeout(1500); } catch(e){}
  }
  await saveScreenshot(page, '08c_game_word_defense_man_choi.png');

  await browser.close();
  console.log('Deep states finished!');
}

run().catch(console.error);
