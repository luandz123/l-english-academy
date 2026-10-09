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
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  console.log('🚀 Starting screenshot capture...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  // 1. PUBLIC CONTEXT
  console.log('📸 Capturing Public / Guest pages...');
  const publicContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const publicPage = await publicContext.newPage();

  // Home Page Top
  await publicPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(2000);
  await saveScreenshot(publicPage, '01_trang_chu_hero.png');

  // Home Page Fullpage
  await saveScreenshot(publicPage, '02_trang_chu_toan_canh.png', { fullPage: true });

  // Login
  await publicPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(1500);
  await saveScreenshot(publicPage, '03_trang_dang_nhap.png');

  // Register
  await publicPage.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(1500);
  await saveScreenshot(publicPage, '04_trang_dang_ky.png');

  // Forgot password
  await publicPage.goto(`${BASE_URL}/forgot-password`, { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(1500);
  await saveScreenshot(publicPage, '05_trang_quen_mat_khau.png');

  // Games Hub
  await publicPage.goto(`${BASE_URL}/games`, { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(2000);
  await saveScreenshot(publicPage, '06_trung_tam_tro_choi.png');

  // Game Word Shooter
  await publicPage.goto(`${BASE_URL}/games/word-shooter`, { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(2000);
  await saveScreenshot(publicPage, '07_game_word_shooter.png');

  // Game Word Defense
  await publicPage.goto(`${BASE_URL}/games/word-defense`, { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(2000);
  await saveScreenshot(publicPage, '08_game_word_defense.png');

  await publicContext.close();

  // 2. AUTHENTICATED USER CONTEXT
  console.log('🔐 Authenticating user for protected student pages...');
  const authContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const authPage = await authContext.newPage();

  await authPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await authPage.fill('input[type="email"]', 'admin@lenglish.vn');
  await authPage.fill('input[type="password"]', 'luan123');
  await authPage.click('button[type="submit"]');
  await authPage.waitForTimeout(3500);
  console.log('Logged in! Current URL:', authPage.url());

  // Dashboard
  console.log('📸 Capturing Student Portal pages...');
  await authPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(2500);
  await saveScreenshot(authPage, '09_dashboard_hoc_vien.png');

  // My Courses
  await authPage.goto(`${BASE_URL}/my-courses`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(2000);
  await saveScreenshot(authPage, '10_khoa_hoc_cua_toi.png');

  // Library
  await authPage.goto(`${BASE_URL}/library`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(2000);
  await saveScreenshot(authPage, '11_thu_vien_tai_lieu.png');

  // Listening
  await authPage.goto(`${BASE_URL}/listening`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(2000);
  await saveScreenshot(authPage, '12_luyen_nghe_listening.png');

  // Full Tests Catalog
  await authPage.goto(`${BASE_URL}/fulltests`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(2000);
  await saveScreenshot(authPage, '13_kho_de_fulltests.png');

  // Course 13 Full Tests List
  await authPage.goto(`${BASE_URL}/courses/13/fulltest`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(2000);
  await saveScreenshot(authPage, '14_danh_sach_de_thi_2024.png');

  // Exam interface (Test 74)
  await authPage.goto(`${BASE_URL}/courses/13/fulltest/74`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(3000);
  await saveScreenshot(authPage, '15_phong_thi_fulltest_exam.png');

  // Part 2 Coach
  await authPage.goto(`${BASE_URL}/part2-coach`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(2500);
  await saveScreenshot(authPage, '16_chuyen_de_part2_coach.png');

  // Course 1 Learn
  await authPage.goto(`${BASE_URL}/courses/1/learn`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(3000);
  await saveScreenshot(authPage, '17_giao_dien_hoc_bai_learn.png');

  // Course 1 Vocab
  await authPage.goto(`${BASE_URL}/courses/1/vocab`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(2500);
  await saveScreenshot(authPage, '18_hoc_tu_vung_vocab.png');

  // Profile
  await authPage.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(2500);
  await saveScreenshot(authPage, '19_trang_ca_nhan_profile.png');

  // Mobile views for Key Experiences
  console.log('📱 Capturing Mobile Responsive views...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  
  await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await saveScreenshot(mobilePage, '20_mobile_trang_chu.png');

  await mobilePage.goto(`${BASE_URL}/games`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await saveScreenshot(mobilePage, '21_mobile_games_hub.png');

  await browser.close();
  console.log('🎉 ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
