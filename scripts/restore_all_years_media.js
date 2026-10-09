import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

const YEARS_CONFIG = [
  { year: '2025', courseId: 14, file: '/home/luan/Desktop/scraping_and_course_data_backup/scraping/bo-de-2025-consolidated.json' },
  { year: '2024', courseId: 13, file: '/home/luan/Desktop/scraping_and_course_data_backup/scraping/bo-de-2024-consolidated.json' },
  { year: '2023', courseId: 12, file: '/home/luan/Desktop/scraping_and_course_data_backup/scraping/bo-de-2023-consolidated.json' },
  { year: '2022', courseId: 11, file: '/home/luan/Desktop/scraping_and_course_data_backup/scraping/bo-de-2022-consolidated.json' },
];

async function restoreYear(config) {
  console.log(`\n========================================================================`);
  console.log(`🚀 Starting restore for Year ${config.year} (Course ID ${config.courseId})...`);

  if (!fs.existsSync(config.file)) {
    console.error(`❌ Backup file not found: ${config.file}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(config.file, 'utf8'));
  const exams = data.exams;
  console.log(`📦 Found ${exams.length} exams in ${config.file}`);

  const { data: dbTests, error: testErr } = await supabase
    .from('full_tests')
    .select('id, title, course_id')
    .eq('course_id', config.courseId)
    .order('id');

  if (testErr || !dbTests || dbTests.length === 0) {
    console.error(`❌ Failed to fetch tests for course ${config.courseId}:`, testErr);
    return;
  }

  for (let i = 0; i < dbTests.length; i++) {
    const test = dbTests[i];
    const exam = exams[i];
    if (!exam) continue;

    console.log(`\n🔄 [${i + 1}/${dbTests.length}] Restoring Test ID ${test.id}: "${test.title}"`);

    // 1. Audio
    if (exam.audio_url) {
      await supabase
        .from('full_tests')
        .update({ audio_url: exam.audio_url })
        .eq('id', test.id);
    }

    // 2. Sections
    const { data: sections } = await supabase
      .from('full_test_sections')
      .select('part_number, quiz_id')
      .eq('test_id', test.id)
      .order('part_number');

    if (!sections || sections.length === 0) continue;

    // 3. Questions
    let jsonOffset = 0;
    const updates = [];

    for (const sec of sections) {
      const { data: dbQs } = await supabase
        .from('questions')
        .select('id, display_order, quiz_id')
        .eq('quiz_id', sec.quiz_id)
        .order('display_order', { ascending: true })
        .order('id', { ascending: true });

      if (!dbQs) continue;

      for (let qIdx = 0; qIdx < dbQs.length; qIdx++) {
        const dbQ = dbQs[qIdx];
        const jsonQ = exam.questions[jsonOffset + qIdx];
        if (!jsonQ) continue;

        updates.push({
          id: dbQ.id,
          audio_url: jsonQ.audio_url || null,
          image_url: jsonQ.image_url || null,
        });
      }

      jsonOffset += dbQs.length;
    }

    // 4. Batch upsert in chunks of 50
    const CHUNK_SIZE = 50;
    for (let c = 0; c < updates.length; c += CHUNK_SIZE) {
      const chunk = updates.slice(c, c + CHUNK_SIZE);
      await supabase.from('questions').upsert(chunk, { onConflict: 'id' });
    }

    console.log(`  ✅ Restored ${updates.length} questions for Test ${test.id}`);
  }
}

async function main() {
  console.log("🔐 Logging in as admin...");
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@lenglish.vn',
    password: 'luan123',
  });

  if (authErr) {
    console.error("❌ Authentication failed:", authErr.message);
    process.exit(1);
  }
  console.log("✅ Authenticated as admin.");

  for (const cfg of YEARS_CONFIG) {
    await restoreYear(cfg);
  }

  console.log(`\n🎉 All years restored successfully!`);
}

main().catch(console.error);
