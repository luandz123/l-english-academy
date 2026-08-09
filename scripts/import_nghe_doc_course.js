/**
 * import_nghe_doc_course.js
 * =========================
 * Imports the "Luyện thi TOEIC Cấp tốc (Nghe - Đọc)" course from the
 * consolidated JSON produced by crawl_nghe_doc_course.py.
 *
 * JSON format expected:
 * {
 *   "course_title": "...",
 *   "modules": [
 *     {
 *       "module_title": "PART 1: ...",
 *       "display_order": 1,
 *       "lessons": [ { "title": "...", "video_url": "...", "display_order": 1 } ],
 *       "quizzes": [
 *         {
 *           "quiz_title": "...",
 *           "display_order": 1,
 *           "audio_url": "...",
 *           "questions": [...]
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * Usage:
 *   node import_nghe_doc_course.js \
 *     --file scraping/toeic_cap_toc_consolidated.json \
 *     --course-id <EXISTING_COURSE_ID>        (import into existing course)
 *     [--skip-media-upload]                   (use original URLs, skip Storage upload)
 *     [--only-module "PART 1: Mô tả tranh"]  (import a single module only)
 *     [--dry-run]                             (print plan without touching DB)
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// ── Environment ──────────────────────────────────────────────────────────────
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

// ── CLI arguments ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}
function hasFlag(flag) { return args.includes(flag); }

const jsonPath = getArg('--file');
const courseIdArg = getArg('--course-id');
const skipMedia = hasFlag('--skip-media-upload');
const dryRun = hasFlag('--dry-run');
const onlyModule = getArg('--only-module') || getArg('--only-part');
const onlyQuiz = getArg('--only-quiz');
const overwrite = hasFlag('--overwrite');

if (!jsonPath) {
  console.error('Usage: node import_nghe_doc_course.js --file <path> [--course-id <id>] [--skip-media-upload] [--dry-run] [--only-module "module title"] [--only-quiz "quiz title"] [--overwrite]');
  process.exit(1);
}
if (!fs.existsSync(jsonPath)) {
  console.error(`Error: File not found: ${jsonPath}`);
  process.exit(1);
}

// ── Media upload helper ───────────────────────────────────────────────────────
const mediaCache = {};

async function uploadMedia(url, label, type = 'auto') {
  if (skipMedia || !url || !url.startsWith('http')) return url;
  if (mediaCache[url]) return mediaCache[url];
  if (url.includes('supabase.co') || url.includes('/storage/v1/object/public/')) return url;

  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() || (type === 'audio' ? 'mp3' : 'jpg');
  const isAudio = type === 'audio' || ['mp3', 'm4a', 'wav', 'ogg'].includes(ext);
  const contentType = isAudio ? 'audio/mpeg' : 'image/jpeg';
  const storagePath = `nghe_doc_media/${label}_${Date.now()}.${ext}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from('materials')
      .upload(storagePath, buffer, { contentType, duplex: 'half' });
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage.from('materials').getPublicUrl(storagePath);
    mediaCache[url] = urlData.publicUrl;
    return urlData.publicUrl;
  } catch (e) {
    console.warn(`    ⚠️  Media upload failed for ${url}: ${e.message}. Using original URL.`);
    return url;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔐 Logging in as admin...');
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@lenglish.vn',
    password: 'luan123',
  });
  if (authErr) { console.error('❌ Login failed:', authErr.message); process.exit(1); }
  console.log('✅ Logged in.');

  if (skipMedia) console.log('⚡ Media upload skipped — using original URLs.');
  if (dryRun)    console.log('🧪 DRY RUN mode — no changes will be written to the database.');

  // ── Load JSON ──────────────────────────────────────────────────────────────
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!raw.course_title || !Array.isArray(raw.modules)) {
    console.error('❌ Invalid JSON: must have "course_title" and "modules" array.');
    process.exit(1);
  }

  console.log(`\n📖 Course: "${raw.course_title}"`);
  console.log(`   ${raw.modules.length} modules in JSON.`);

  // ── Find or create Course ──────────────────────────────────────────────────
  let courseId = courseIdArg ? parseInt(courseIdArg, 10) : null;

  if (courseId) {
    const { data: c } = await supabase.from('courses').select('id, title').eq('id', courseId).maybeSingle();
    if (!c) { console.error(`❌ Course ID ${courseId} not found.`); process.exit(1); }
    console.log(`\n🎯 Targeting existing course: ID=${c.id} | "${c.title}"`);
  } else {
    // Try to find by title
    const { data: existing } = await supabase.from('courses').select('id, title')
      .eq('title', raw.course_title).maybeSingle();

    if (existing) {
      courseId = existing.id;
      console.log(`\n✅ Found existing course by title: ID=${courseId}`);
    } else {
      if (dryRun) {
        console.log(`\n🧪 [DRY RUN] Would create course: "${raw.course_title}"`);
        courseId = 0;
      } else {
        const { data: newCourse, error: cErr } = await supabase.from('courses').insert({
          title: raw.course_title,
          subtitle: 'Khóa luyện nghe đọc TOEIC cấp tốc, đầy đủ các part từ 1 đến 7',
          course_type: 'video_quiz',
          is_active: true,
          price: 0,
          duration_months: 12,
          instructor: 'Cô Mai Phương',
        }).select('id').single();
        if (cErr) { console.error('❌ Failed to create course:', cErr); process.exit(1); }
        courseId = newCourse.id;
        console.log(`\n➕ Created new course: ID=${courseId}`);
      }
    }
  }

  // ── Process modules ────────────────────────────────────────────────────────
  let modulesToProcess = raw.modules;
  if (onlyModule) {
    modulesToProcess = raw.modules.filter(m => m.module_title === onlyModule);
    if (modulesToProcess.length === 0) {
      console.error(`❌ Module not found: "${onlyModule}"`);
      console.log('Available modules:');
      raw.modules.forEach(m => console.log(`  - "${m.module_title}"`));
      process.exit(1);
    }
    console.log(`\n🎯 Only processing module: "${onlyModule}"`);
  }

  for (const mod of modulesToProcess) {
    const moduleTitle = mod.module_title || `Module ${mod.display_order}`;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Module: "${moduleTitle}" (order ${mod.display_order})`);
    console.log(`   Lessons: ${(mod.lessons || []).length} | Quizzes: ${(mod.quizzes || []).length}`);
    console.log('='.repeat(60));

    // Find or create Module
    let moduleId;
    if (dryRun) {
      console.log(`🧪 [DRY RUN] Would create/find module: "${moduleTitle}"`);
      moduleId = 0;
    } else {
      const { data: existingMod } = await supabase.from('modules').select('id')
        .eq('course_id', courseId).eq('title', moduleTitle).maybeSingle();

      if (existingMod) {
        moduleId = existingMod.id;
        console.log(`  ✅ Found existing module: ID=${moduleId}`);
      } else {
        const { data: newMod, error: modErr } = await supabase.from('modules').insert({
          course_id: courseId,
          title: moduleTitle,
          description: '',
          display_order: mod.display_order,
        }).select('id').single();
        if (modErr) { console.error('  ❌ Failed to create module:', modErr); continue; }
        moduleId = newMod.id;
        console.log(`  ➕ Created module: ID=${moduleId}`);
      }
    }

    // ── Import Lessons ───────────────────────────────────────────────────────
    const lessons = mod.lessons || [];
    if (lessons.length > 0) {
      console.log(`\n  📹 Importing ${lessons.length} lessons...`);
      for (const lesson of lessons) {
        if (dryRun) {
          console.log(`  🧪 [DRY RUN] Lesson: "${lesson.title}" | video=${lesson.video_url || 'null'}`);
          continue;
        }
        // Check if lesson already exists
        const { data: existingLesson } = await supabase.from('lessons').select('id')
          .eq('module_id', moduleId).eq('title', lesson.title).maybeSingle();

        if (existingLesson) {
          console.log(`    ✅ Lesson already exists: "${lesson.title}"`);
          continue;
        }

        const { error: lessonErr } = await supabase.from('lessons').insert({
          module_id: moduleId,
          title: lesson.title,
          video_url: lesson.video_url || null,
          duration_seconds: 0,
          display_order: lesson.display_order,
          is_live: false,
        });
        if (lessonErr) {
          console.warn(`    ⚠️  Failed to create lesson "${lesson.title}": ${lessonErr.message}`);
        } else {
          console.log(`    ➕ Created lesson: "${lesson.title}"`);
        }
      }
    }

    // ── Import Quizzes ───────────────────────────────────────────────────────
    const quizzes = mod.quizzes || [];
    if (quizzes.length === 0) {
      console.log('  ℹ️  No quizzes in this module.');
      continue;
    }

    console.log(`\n  📝 Importing ${quizzes.length} quizzes...`);

    for (const quiz of quizzes) {
      const quizTitle = quiz.quiz_title || `Quiz ${quiz.display_order}`;
      if (onlyQuiz && quizTitle !== onlyQuiz) {
        console.log(`\n  ── Quiz: "${quizTitle}" ── skipped (does not match --only-quiz)`);
        continue;
      }
      const questions = quiz.questions || [];
      console.log(`\n  ── Quiz: "${quizTitle}" (${questions.length} questions) ──`);

      if (dryRun) {
        console.log(`  🧪 [DRY RUN] Would create quiz with ${questions.length} questions.`);
        continue;
      }

      // Find or create Quiz
      let quizId;
      const { data: existingQuiz } = await supabase.from('quizzes').select('id')
        .eq('module_id', moduleId).eq('title', quizTitle).maybeSingle();

      if (existingQuiz) {
        quizId = existingQuiz.id;
        const { count, error: countErr } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quizId);
        
        if (countErr) {
          console.warn(`    ⚠️  Failed to check existing questions count: ${countErr.message}`);
        }
        
        if (count !== null && count > 0) {
          if (overwrite) {
            console.log(`    ⚠️  Quiz already exists. Overwriting questions/answers for quiz ID=${quizId}...`);
            // Delete answers
            const { data: qIdsData } = await supabase.from('questions').select('id').eq('quiz_id', quizId);
            const qIds = qIdsData?.map(q => q.id) || [];
            if (qIds.length > 0) {
              const { error: delAnsErr } = await supabase.from('answers').delete().in('question_id', qIds);
              if (delAnsErr) {
                console.error(`    ❌ Failed to delete existing answers:`, delAnsErr);
                continue;
              }
              const { error: delQsErr } = await supabase.from('questions').delete().eq('quiz_id', quizId);
              if (delQsErr) {
                console.error(`    ❌ Failed to delete existing questions:`, delQsErr);
                continue;
              }
            }
          } else {
            console.log(`    ✅ Quiz already exists with ${count} questions. Skipping overwrite to preserve data.`);
            continue;
          }
        }
        console.log(`    ✅ Found existing empty or cleared quiz: ID=${quizId}. Importing questions...`);
      } else {
        const { data: newQuiz, error: qErr } = await supabase.from('quizzes').insert({
          module_id: moduleId,
          title: quizTitle,
          total_questions: questions.length,
          time_limit_seconds: 0,
          display_order: quiz.display_order,
        }).select('id').single();
        if (qErr) { console.error(`    ❌ Failed to create quiz "${quizTitle}":`, qErr); continue; }
        quizId = newQuiz.id;
        console.log(`    ➕ Created quiz: ID=${quizId}`);
      }

      if (questions.length === 0) {
        console.log('    ℹ️  No questions in this quiz.');
        continue;
      }

      // Upload quiz-level audio and save to DB
      let quizAudioUrl = null;
      if (quiz.audio_url) {
        quizAudioUrl = await uploadMedia(quiz.audio_url, `quiz_${quizId}_main`, 'audio');
        console.log(`    🎵 Quiz audio: ${quizAudioUrl.slice(0, 80)}...`);
        // Save audio_url to quizzes table
        const { error: auErr } = await supabase.from('quizzes').update({ audio_url: quizAudioUrl }).eq('id', quizId);
        if (auErr) console.warn(`    ⚠️  Failed to save quiz audio_url: ${auErr.message}`);
        else console.log(`    💾 Saved audio_url to quiz ID=${quizId}`);
      } else {
        // Derive audio_url from first question if quiz-level not set
        const firstAudio = questions.find(q => q.audio_url)?.audio_url;
        if (firstAudio) {
          quizAudioUrl = await uploadMedia(firstAudio, `quiz_${quizId}_main`, 'audio');
          const { error: auErr } = await supabase.from('quizzes').update({ audio_url: quizAudioUrl }).eq('id', quizId);
          if (!auErr) console.log(`    💾 Derived and saved audio_url from Q1 to quiz ID=${quizId}`);
        }
      }

      // Build questions with media upload
      console.log(`    ⏳ Processing ${questions.length} questions and media...`);
      const parsedQuestions = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const stepLabel = `quiz_${quizId}_q${i + 1}`;

        if ((i + 1) % 10 === 0 || i + 1 === questions.length) {
          process.stdout.write(`\r    ⏳ ${i + 1}/${questions.length} questions processed...`);
        }

        const audioUrl = q.audio_url
          ? await uploadMedia(q.audio_url, `${stepLabel}_audio`, 'audio')
          : null;
        const imageUrl = q.image_url
          ? await uploadMedia(q.image_url, `${stepLabel}_img`, 'image')
          : null;

        let questionText = q.question_text || '';
        if (q.passage_text) {
          questionText = `[PASSAGE]${q.passage_text}[ENDPASSAGE]${questionText}`;
        }

        const part = q.part || q.part_number || null;
        const questionType = part ? `part${part}` : 'multiple_choice';

        parsedQuestions.push({
          quiz_id: quizId,
          question_text: questionText,
          question_type: questionType,
          display_order: q.display_order || (i + 1),
          audio_url: audioUrl,
          image_url: imageUrl,
          group_id: q.group_id ? String(q.group_id) : null,
          transcript: q.transcript || null,
          translation: q.translation || q.translation_text || null,
          answers: q.answers || [],
        });
      }
      console.log(''); // newline after progress

      // Insert questions in chunks
      console.log(`    💾 Inserting ${parsedQuestions.length} questions...`);
      const insertedQs = [];
      for (let i = 0; i < parsedQuestions.length; i += 50) {
        const chunk = parsedQuestions.slice(i, i + 50);
        const { data: ins, error: insErr } = await supabase.from('questions').insert(
          chunk.map(pq => ({
            quiz_id: pq.quiz_id,
            question_text: pq.question_text,
            question_type: pq.question_type,
            display_order: pq.display_order,
            audio_url: pq.audio_url,
            image_url: pq.image_url,
            group_id: pq.group_id,
            transcript: pq.transcript,
          }))
        ).select('id');
        if (insErr) { console.error('    ❌ Insert questions error:', insErr); continue; }
        if (ins) insertedQs.push(...ins);
      }
      console.log(`    ✅ Inserted ${insertedQs.length} questions.`);

      // Insert answers
      const allAnswers = [];
      parsedQuestions.forEach((pq, idx) => {
        const qId = insertedQs[idx]?.id;
        if (!qId) return;
        (pq.answers || []).forEach((ans, aIdx) => {
          allAnswers.push({
            question_id: qId,
            answer_text: ans.answer_text || ans.text || '',
            is_correct: !!ans.is_correct || !!ans.correct,
            explanation: ans.explanation || null,
            display_order: ans.display_order !== undefined ? ans.display_order : aIdx,
          });
        });
      });

      if (allAnswers.length > 0) {
        for (let i = 0; i < allAnswers.length; i += 100) {
          const { error: ansErr } = await supabase.from('answers').insert(allAnswers.slice(i, i + 100));
          if (ansErr) console.error('    ❌ Insert answers error:', ansErr);
        }
        console.log(`    ✅ Inserted ${allAnswers.length} answers.`);
      }

      // Update total_questions count
      const { count } = await supabase.from('questions')
        .select('id', { count: 'exact', head: true }).eq('quiz_id', quizId);
      await supabase.from('quizzes').update({ total_questions: count || 0 }).eq('id', quizId);
      console.log(`    📊 Quiz total_questions updated: ${count || 0}`);
    }
  }

  console.log('\n\n' + '⭐'.repeat(20));
  console.log('🏁 Import complete!');
  console.log('⭐'.repeat(20) + '\n');
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
