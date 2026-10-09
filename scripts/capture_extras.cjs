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
  console.log('Saved extra screenshot:', filename);
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

  // 2. Full Test Active Exam Screen
  console.log('Opening fulltest exam...');
  await page.goto(BASE_URL + '/courses/13/fulltest/74', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const startBtn = await page.locator('button:has-text("BẮT ĐẦU LÀM BÀI")').first();
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(3000);
    await saveScreenshot(page, '15b_phong_thi_fulltest_dang_lam_bai.png');
  }

  // 3. Part 2 Coach Stepper / Interactive Practice Screen
  console.log('Opening Part 2 Coach Stepper...');
  await page.goto(BASE_URL + '/part2-coach', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const vaoHocBtn = await page.locator('button:has-text("Vào học"), a:has-text("Vào học")').first();
  if (await vaoHocBtn.isVisible()) {
    await vaoHocBtn.click();
    await page.waitForTimeout(3000);
    await saveScreenshot(page, '16b_part2_coach_stepper_luyen_tap.png');
  }

  // 4. Word Shooter Game Board without dialog
  console.log('Opening Word Shooter gameplay...');
  await page.goto(BASE_URL + '/games/word-shooter', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const skipBtn = await page.locator('button:has-text("Bỏ qua"), button:has-text("Đóng"), button:has-text("Bắt đầu"), [aria-label="Close"], .lucide-x').first();
  if (await skipBtn.isVisible()) {
    await skipBtn.click();
    await page.waitForTimeout(1000);
  }
  await saveScreenshot(page, '07b_game_word_shooter_man_choi.png');

  // 5. Course Learn Quiz
  console.log('Opening Course Learn Quiz...');
  await page.goto(BASE_URL + '/courses/1/learn', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const lamBaiBtn = await page.locator('button:has-text("Làm lại bài thi"), button:has-text("Làm bài thi")').first();
  if (await lamBaiBtn.isVisible()) {
    await lamBaiBtn.click();
    await page.waitForTimeout(2500);
    await saveScreenshot(page, '17b_giao_dien_lam_bai_thi_khoa_hoc.png');
  }

  await browser.close();
  console.log('Extra states captured!');
}

run().catch(console.error);
