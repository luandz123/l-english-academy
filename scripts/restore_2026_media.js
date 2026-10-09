import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

const BACKUP_FILE = '/home/luan/Desktop/scraping_and_course_data_backup/scraping/bo-de-2026-consolidated.json';

async function restore2026() {
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

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`❌ Backup file not found: ${BACKUP_FILE}`);
    process.exit(1);
  }

  console.log(`📖 Reading backup data from ${BACKUP_FILE}...`);
  const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  const exams = data.exams;
  console.log(`📦 Found ${exams.length} exams in backup.`);

  // Course 19 tests map to IDs 113 through 122
  const { data: dbTests, error: testErr } = await supabase
    .from('full_tests')
    .select('id, title, course_id')
    .eq('course_id', 19)
    .order('id');

  if (testErr || !dbTests || dbTests.length === 0) {
    console.error("❌ Failed to fetch 2026 tests from database:", testErr);
    process.exit(1);
  }

  console.log(`🎯 Found ${dbTests.length} tests for Course 19 in database.`);

  let totalQuestionsUpdated = 0;
  let totalTestsUpdated = 0;

  for (let i = 0; i < dbTests.length; i++) {
    const test = dbTests[i];
    const exam = exams[i];

    if (!exam) {
      console.warn(`⚠️ No matching exam in JSON for test index ${i} (Test ID ${test.id})`);
      continue;
    }

    console.log(`\n============================================================`);
    console.log(`🔄 [${i + 1}/${dbTests.length}] Restoring Test ID ${test.id}: "${test.title}"...`);

    // 1. Restore full_test audio_url
    if (exam.audio_url) {
      const { error: ftUpdateErr } = await supabase
        .from('full_tests')
        .update({ audio_url: exam.audio_url })
        .eq('id', test.id);

      if (ftUpdateErr) {
        console.error(`❌ Error updating audio_url for test ${test.id}:`, ftUpdateErr.message);
      } else {
        console.log(`  ✅ Restored test audio_url: ${exam.audio_url.substring(0, 70)}...`);
        totalTestsUpdated++;
      }
    }

    // 2. Fetch sections for this test
    const { data: sections, error: secErr } = await supabase
      .from('full_test_sections')
      .select('part_number, quiz_id')
      .eq('test_id', test.id)
      .order('part_number');

    if (secErr || !sections || sections.length === 0) {
      console.error(`  ❌ Failed to fetch sections for test ${test.id}:`, secErr);
      continue;
    }

    // 3. For each section, update its questions
    let jsonOffset = 0;
    const allQuestionsUpdates = [];

    for (const sec of sections) {
      const { data: dbQs, error: qErr } = await supabase
        .from('questions')
        .select('id, display_order, quiz_id')
        .eq('quiz_id', sec.quiz_id)
        .order('display_order', { ascending: true })
        .order('id', { ascending: true });

      if (qErr || !dbQs) {
        console.error(`  ❌ Error fetching questions for quiz ${sec.quiz_id}:`, qErr);
        continue;
      }

      for (let qIdx = 0; qIdx < dbQs.length; qIdx++) {
        const dbQ = dbQs[qIdx];
        const jsonQ = exam.questions[jsonOffset + qIdx];

        if (!jsonQ) {
          console.warn(`    ⚠️ Missing JSON question at offset ${jsonOffset + qIdx}`);
          continue;
        }

        allQuestionsUpdates.push({
          id: dbQ.id,
          audio_url: jsonQ.audio_url || null,
          image_url: jsonQ.image_url || null,
        });
      }

      jsonOffset += dbQs.length;
    }

    console.log(`  📝 Prepared ${allQuestionsUpdates.length} question media updates.`);

    // 4. Batch upsert questions in chunks of 50
    const CHUNK_SIZE = 50;
    for (let c = 0; c < allQuestionsUpdates.length; c += CHUNK_SIZE) {
      const chunk = allQuestionsUpdates.slice(c, c + CHUNK_SIZE);
      const { error: upsertErr } = await supabase
        .from('questions')
        .upsert(chunk, { onConflict: 'id' });

      if (upsertErr) {
        console.error(`  ❌ Failed upserting questions chunk ${c / CHUNK_SIZE + 1}:`, upsertErr.message);
      } else {
        totalQuestionsUpdated += chunk.length;
      }
    }

    console.log(`  ✅ Successfully restored questions for Test ID ${test.id}`);
  }

  console.log(`\n🎉 Restoration finished!`);
  console.log(`   - Tests updated: ${totalTestsUpdated}`);
  console.log(`   - Questions updated: ${totalQuestionsUpdated}`);

  // Verification step
  console.log(`\n🔍 Verifying Course 19 in database...`);
  const testIds = dbTests.map(t => t.id);
  const { data: sections } = await supabase.from('full_test_sections').select('quiz_id').in('test_id', testIds);
  const quizIds = sections.map(s => s.quiz_id);

  const { count: remainingDeadAudio } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .in('quiz_id', quizIds)
    .ilike('audio_url', '%squqwkxgsxqojhqmdvbo%');

  const { count: remainingDeadImage } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .in('quiz_id', quizIds)
    .ilike('image_url', '%squqwkxgsxqojhqmdvbo%');

  const { count: remainingDeadTestAudio } = await supabase
    .from('full_tests')
    .select('*', { count: 'exact', head: true })
    .in('id', testIds)
    .ilike('audio_url', '%squqwkxgsxqojhqmdvbo%');

  console.log(`   - Remaining questions with dead audio: ${remainingDeadAudio}`);
  console.log(`   - Remaining questions with dead image: ${remainingDeadImage}`);
  console.log(`   - Remaining tests with dead audio: ${remainingDeadTestAudio}`);

  if (remainingDeadAudio === 0 && remainingDeadImage === 0 && remainingDeadTestAudio === 0) {
    console.log(`🌟 SUCCESS! 100% of 2026 tests media restored to valid Google Cloud Storage URLs!`);
  }
}

restore2026().catch(console.error);
