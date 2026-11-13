#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
const { Client } = req(path.resolve('backend/node_modules/pg'));

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const eq = raw.indexOf('=');
    if (eq === -1) args[raw.slice(2)] = true;
    else args[raw.slice(2, eq)] = raw.slice(eq + 1);
  }
  return args;
}

function loadEnvFile(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const STOP_WORDS = new Set([
  'that', 'this', 'with', 'from', 'they', 'them', 'their', 'there', 'these', 'those',
  'what', 'when', 'where', 'which', 'whom', 'whose', 'will', 'would', 'could', 'should',
  'have', 'having', 'been', 'being', 'were', 'your', 'about', 'after', 'before', 'into',
  'onto', 'over', 'under', 'more', 'most', 'other', 'another', 'such', 'than', 'then',
  'only', 'even', 'here', 'well', 'sure', 'okay', 'hello', 'good', 'some', 'many', 'much',
  'very', 'just', 'also', 'look', 'does', 'didn', 'doesn', 'isn', 'aren', 'wasn', 'weren',
  'won', 'can', 'yes', 'please', 'thanks', 'thank',
]);

function extractDictationKeywords(texts, maxKeywords = 7) {
  const combined = texts.filter(Boolean).join(' ');
  const tokens = combined.match(/\b[A-Za-z]{4,}\b/g) || [];
  const picked = [];
  const seenLower = new Set();

  for (const tok of tokens) {
    const low = tok.toLowerCase();
    if (STOP_WORDS.has(low) || seenLower.has(low)) continue;
    seenLower.add(low);
    picked.push(tok);
    if (picked.length >= maxKeywords) break;
  }

  if (picked.length < 2) {
    const fallbackTokens = combined.match(/\b[A-Za-z]{2,}\b/g) || [];
    for (const tok of fallbackTokens) {
      const low = tok.toLowerCase();
      if (seenLower.has(low)) continue;
      seenLower.add(low);
      picked.push(tok);
      if (picked.length >= Math.min(4, maxKeywords)) break;
    }
  }
  return picked.join(',');
}

function splitEnglishTranscriptSentences(transcriptText) {
  if (!transcriptText) return [];
  const lines = transcriptText
    .split(/\r?\n/)
    .map((l) => l.replace(/^(?:M\d*|W\d*|Man|Woman|Speaker\s*\d*)\s*:\s*/i, '').trim())
    .filter(Boolean);

  const sentences = [];
  for (const line of lines) {
    const chunks = line
      .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
      .map((s) => s.trim())
      .filter(Boolean);
    sentences.push(...chunks);
  }
  return sentences;
}

// Reused from scripts/build-part2-clusters.js
function extractStem(qText) {
  const lower = (qText || '').toLowerCase().trim();
  if (lower.startsWith('where is') || lower.startsWith("where's")) {
    return { text: 'Where is / Where are', type: 'wh-question', label: 'Câu hỏi Nơi chốn (Where)', tip: 'Tìm giới từ chỉ nơi chốn (at, in, on, next to...) hoặc địa điểm. Không bao giờ chọn Yes/No!' };
  }
  if (lower.startsWith('where')) {
    return { text: 'Where', type: 'wh-question', label: 'Câu hỏi Nơi chốn (Where)', tip: 'Tìm vị trí, phòng ban, địa chỉ. Không bao giờ chọn Yes/No!' };
  }
  if (lower.startsWith('when does') || lower.startsWith('when will') || lower.startsWith('when is') || lower.startsWith("when's") || lower.startsWith('when')) {
    return { text: 'When', type: 'wh-question', label: 'Câu hỏi Thời gian (When)', tip: 'Tìm mốc thời gian (giờ, ngày, buổi, liên từ until/after/before). Tuyệt đối tránh Yes/No!' };
  }
  if (lower.startsWith('who should') || lower.startsWith('who sent') || lower.startsWith('who is') || lower.startsWith("who's") || lower.startsWith('who')) {
    return { text: 'Who', type: 'wh-question', label: 'Câu hỏi Người (Who)', tip: 'Tìm tên người, chức danh (manager, assistant), phòng ban hoặc câu gián tiếp.' };
  }
  if (lower.startsWith('why was') || lower.startsWith('why did') || lower.startsWith('why is') || lower.startsWith('why')) {
    return { text: 'Why', type: 'wh-question', label: 'Câu hỏi Lý do (Why)', tip: 'Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!' };
  }
  if (lower.startsWith('what time')) {
    return { text: 'What time', type: 'wh-question', label: 'Câu hỏi Giờ giấc cụ thể', tip: 'Tìm mốc giờ cụ thể (at 6 o’clock, after 2 PM) hoặc giờ mở/đóng cửa.' };
  }
  if (lower.startsWith('what')) {
    return { text: 'What', type: 'wh-question', label: 'Câu hỏi Thông tin (What)', tip: 'Bắt danh từ trọng tâm hoặc thông tin được yêu cầu.' };
  }
  if (lower.startsWith('how long')) {
    return { text: 'How long', type: 'wh-question', label: 'Câu hỏi Khoảng thời gian', tip: 'Tìm khoảng thời gian (for 2 weeks, three days), khác với When (mốc thời gian).' };
  }
  if (lower.startsWith('how much') || lower.startsWith('how many')) {
    return { text: 'How much / How many', type: 'wh-question', label: 'Câu hỏi Số lượng / Giá cả', tip: 'Tìm con số hoặc giá tiền ($50, ten copies).' };
  }
  if (lower.startsWith('how')) {
    return { text: 'How', type: 'wh-question', label: 'Câu hỏi Phương thức (How)', tip: 'Tìm phương tiện (by bus, online) hoặc cách thức thực hiện.' };
  }
  if (lower.startsWith('would you like') || lower.startsWith('do you want') || lower.includes(' or ')) {
    return { text: 'Would you like / Choice (or)', type: 'choice-or', label: 'Câu hỏi Mời / Lựa chọn', tip: 'Nếu có OR: Chọn 1 trong 2 hoặc Either way (cái nào cũng được). Nếu là lời mời: Sure, I’d love to / No thanks.' };
  }
  if (lower.startsWith('will you') || lower.startsWith('can you') || lower.startsWith('could you')) {
    return { text: 'Can / Could / Will you', type: 'request-offer', label: 'Câu hỏi Yêu cầu / Đề nghị', tip: 'Đáp lại sự đồng ý (Sure, certainly, no problem) hoặc từ chối lịch sự.' };
  }
  if (lower.includes(', right?') || lower.includes(", don't you?") || lower.includes(", isn't it?") || lower.includes(", didn't you?")) {
    return { text: 'Tag Question (...right?)', type: 'tag-question', label: 'Câu hỏi Đuôi / Xác nhận', tip: 'Tìm kiếm sự xác nhận thông tin. Thường trả lời bằng Yes/No hoặc đính chính thông tin.' };
  }
  if (/^(do|did|have|has|is|are|was|were|should|would|won't|isn't|aren't|haven't|don't|didn't)\s+/i.test(lower)) {
    return { text: 'Yes/No Question', type: 'yes-no', label: 'Câu hỏi Yes/No', tip: 'Có thể trả lời trực tiếp bằng Yes/No hoặc trả lời gián tiếp bằng tình huống thực tế.' };
  }
  return { text: 'Statement / Trần thuật', type: 'statement', label: 'Câu trần thuật (Statement)', tip: 'Bày tỏ quan điểm hoặc đưa ra sự thật. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại.' };
}

function classifyTrap(choiceText, qText) {
  const cLower = (choiceText || '').toLowerCase();
  const qLower = (qText || '').toLowerCase();
  const isWh = /^(who|when|where|why|what|which|how)/i.test(qLower) && !/^(would you like|do you want)/i.test(qLower);

  if (isWh && /^(yes|no|sure|certainly)\b/i.test(cLower)) {
    return {
      trapType: 'yes_no_wh',
      trapNameVi: 'Bẫy Yes/No cho câu hỏi Wh-',
      analysisVi: 'Câu hỏi bắt đầu bằng đại từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp.',
    };
  }
  const qWords = qText.replace(/[^a-zA-Z\s]/g, '').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const cWords = choiceText.replace(/[^a-zA-Z\s]/g, '').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const commonWords = qWords.filter((w) => cWords.includes(w));
  if (commonWords.length > 0) {
    return {
      trapType: 'same_sound',
      trapNameVi: `Bẫy lặp từ (${commonWords[0]})`,
      analysisVi: `Người ra đề cố tình lặp lại từ "${commonWords[0]}" để đánh lừa thí sinh nghe loáng thoáng chọn bừa.`,
    };
  }
  if (qLower.startsWith('where') && /(yesterday|tomorrow|monday|april|o'clock|hours|days|minutes)/i.test(cLower)) {
    return {
      trapType: 'wrong_tense',
      trapNameVi: 'Bẫy nhầm Khi nào (When) thay vì Ở đâu (Where)',
      analysisVi: 'Phương án này trả lời cho câu hỏi về mốc thời gian, trong khi câu hỏi hỏi về địa điểm (Where).',
    };
  }
  if (qLower.startsWith('when') && /(room|hotel|office|street|building|park|cabinet)/i.test(cLower)) {
    return {
      trapType: 'irrelevant',
      trapNameVi: 'Bẫy nhầm Ở đâu (Where) thay vì Khi nào (When)',
      analysisVi: 'Phương án này trả lời về vị trí nơi chốn, trong khi câu hỏi hỏi mốc thời gian (When).',
    };
  }
  if (qLower.startsWith('who') && /(table|flight|report|car|bus|money|dollar)/i.test(cLower)) {
    return {
      trapType: 'association',
      trapNameVi: 'Bẫy đồ vật / Lạc đề thay vì chỉ Người (Who)',
      analysisVi: 'Câu hỏi hỏi về con người (Who) nhưng phương án lại đưa ra đồ vật hoặc sự việc.',
    };
  }
  return {
    trapType: 'irrelevant',
    trapNameVi: 'Bẫy lạc đề / Không liên quan ngữ cảnh',
    analysisVi: 'Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm.',
  };
}

async function deleteQuizIds(client, quizIds) {
  if (!quizIds.length) return;
  const qRows = await client.query('SELECT id FROM questions WHERE quiz_id = ANY($1::int[])', [quizIds]);
  const qIds = qRows.rows.map((r) => r.id);
  if (qIds.length > 0) {
    await client.query('DELETE FROM answers WHERE question_id = ANY($1::int[])', [qIds]);
    await client.query('DELETE FROM questions WHERE id = ANY($1::int[])', [qIds]);
  }
  await client.query('DELETE FROM lessons WHERE quiz_id = ANY($1::int[])', [quizIds]);
  await client.query('DELETE FROM full_test_sections WHERE quiz_id = ANY($1::int[])', [quizIds]);
  await client.query('DELETE FROM quizzes WHERE id = ANY($1::int[])', [quizIds]);
}

async function importIntoDatabase(label, connectionString, tests) {
  console.log(`\n=== Importing into ${label} ===`);
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Full Test Course
    const fulltestCourseTitle = 'Bộ đề TOEIC LR Collection (Study4)';
    let ftCourseRes = await client.query(
      "SELECT id FROM courses WHERE course_type = 'fulltest' AND title = $1 LIMIT 1",
      [fulltestCourseTitle],
    );
    let ftCourseId;
    if (ftCourseRes.rows.length > 0) {
      ftCourseId = ftCourseRes.rows[0].id;
      await client.query(
        'UPDATE courses SET is_active = true, is_free = true, price = 0 WHERE id = $1',
        [ftCourseId],
      );
    } else {
      const ins = await client.query(
        `INSERT INTO courses (title, subtitle, description, course_type, price, duration_months, instructor, is_active, is_free, display_order)
         VALUES ($1, $2, $3, 'fulltest', 0, 12, 'Study4 TOEIC', true, true, 1)
         RETURNING id`,
        [
          fulltestCourseTitle,
          'Đề thi thử TOEIC chuẩn format mới kèm audio, transcript và giải thích chi tiết',
          'Tổng hợp bộ đề TOEIC LR Collection từ Study4 gồm đầy đủ 200 câu Part 1-7, đáp án, dịch nghĩa và giải thích chi tiết.',
        ],
      );
      ftCourseId = ins.rows[0].id;
    }

    let importedFullTests = 0;
    let importedFullTestQuestions = 0;
    const sectionQuizMap = new Map();

    for (let tIdx = 0; tIdx < tests.length; tIdx++) {
      const t = tests[tIdx];
      const testTitle = t.title;
      const existingFt = await client.query(
        'SELECT id FROM full_tests WHERE course_id = $1 AND title = $2 LIMIT 1',
        [ftCourseId, testTitle],
      );

      if (existingFt.rows.length > 0) {
        const oldTestId = existingFt.rows[0].id;
        const attempts = await client.query(
          'SELECT COUNT(*)::int AS cnt FROM user_full_test_results WHERE test_id = $1',
          [oldTestId],
        );
        const secRows = await client.query(
          'SELECT part_number, quiz_id FROM full_test_sections WHERE test_id = $1 AND quiz_id IS NOT NULL',
          [oldTestId],
        );
        if (attempts.rows[0].cnt > 0 || secRows.rows.length === 7) {
          console.log(`  [FullTest] Skipping "${testTitle}" (already imported with 7 sections).`);
          for (const sr of secRows.rows) {
            sectionQuizMap.set(`${testTitle}::part${sr.part_number}`, sr.quiz_id);
          }
          continue;
        }
        const oldQuizIds = secRows.rows.map((r) => r.quiz_id);
        await client.query('DELETE FROM full_test_sections WHERE test_id = $1', [oldTestId]);
        await client.query('DELETE FROM full_tests WHERE id = $1', [oldTestId]);
        await deleteQuizIds(client, oldQuizIds);
      }

      const ftInsert = await client.query(
        `INSERT INTO full_tests (course_id, category, title, total_questions, display_order, audio_url, description, duration_minutes, test_type, verification_status, year)
         VALUES ($1, 'general', $2, $3, $4, $5, $6, 120, 'full', 'verified', 2026)
         RETURNING id`,
        [
          ftCourseId,
          testTitle,
          t.totalQuestions,
          tIdx + 1,
          t.mainAudioUrl,
          `${testTitle} - Nguồn Study4 (200 câu Listening & Reading kèm transcript và giải thích).`,
        ],
      );
      const testId = ftInsert.rows[0].id;
      importedFullTests++;

      for (let partNumber = 1; partNumber <= 7; partNumber++) {
        const partQs = t.questions.filter((q) => q.partNumber === partNumber);
        const quizInsert = await client.query(
          `INSERT INTO quizzes (module_id, title, total_questions, time_limit_seconds, display_order, audio_url, is_free)
           VALUES (NULL, $1, $2, 7200, $3, $4, true)
           RETURNING id`,
          [
            `${testTitle} - Part ${partNumber}`,
            partQs.length,
            partNumber,
            partNumber <= 4 ? t.mainAudioUrl : null,
          ],
        );
        const quizId = quizInsert.rows[0].id;
        sectionQuizMap.set(`${testTitle}::part${partNumber}`, quizId);

        await client.query(
          'INSERT INTO full_test_sections (test_id, part_number, quiz_id) VALUES ($1, $2, $3)',
          [testId, partNumber, quizId],
        );

        for (let pIdx = 0; pIdx < partQs.length; pIdx++) {
          const q = partQs[pIdx];
          const isP12 = partNumber === 1 || partNumber === 2;
          const qText = isP12 ? '' : q.questionText || '';

          let combinedTrans = q.translationText || '';
          if ((partNumber === 3 || partNumber === 4) && q.groupTranslationText) {
            combinedTrans = combinedTrans
              ? `${combinedTrans}\n\n[Dịch hội thoại/bài nói]:\n${q.groupTranslationText}`
              : q.groupTranslationText;
          } else if ((partNumber === 6 || partNumber === 7) && q.passageTranslationText) {
            combinedTrans = combinedTrans
              ? `${combinedTrans}\n\n[Dịch đoạn văn]:\n${q.passageTranslationText}`
              : q.passageTranslationText;
          }

          const qInsert = await client.query(
            `INSERT INTO questions (
               quiz_id, question_text, question_type, image_url, audio_url, display_order,
               translation, explanation, transcript, passage_text, group_id,
               toeic_part, part_index, practice_eligible
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true)
             RETURNING id`,
            [
              quizId,
              qText,
              `part${partNumber}`,
              q.imageUrl || null,
              q.audioUrl || null,
              q.questionNumber,
              combinedTrans || null,
              q.explanationText || null,
              q.transcriptText || null,
              q.passageHtml || null,
              q.groupId || null,
              partNumber,
              pIdx + 1,
            ],
          );
          const newQid = qInsert.rows[0].id;
          importedFullTestQuestions++;

          for (const ans of q.answers) {
            await client.query(
              `INSERT INTO answers (question_id, answer_text, is_correct, display_order)
               VALUES ($1, $2, $3, $4)`,
              [newQid, isP12 ? '' : ans.text || '', Boolean(ans.isCorrect), ans.displayOrder],
            );
          }
        }
      }
    }

    // 2. Dictation Course (Listening / Nghe Chép Chính Tả)
    let dictCourseRes = await client.query(
      "SELECT id FROM courses WHERE course_type = 'listening' AND is_active = true ORDER BY id LIMIT 1",
    );
    let dictCourseId;
    if (dictCourseRes.rows.length > 0) {
      dictCourseId = dictCourseRes.rows[0].id;
    } else {
      const ins = await client.query(
        `INSERT INTO courses (title, subtitle, description, course_type, price, duration_months, instructor, is_active, is_free, display_order)
         VALUES ('Nghe Chép Chính Tả', 'Luyện nghe TOEIC chuyên sâu', 'Luyện nghe chép chính tả từ dễ đến khó theo từng phần.', 'listening', 0, 12, 'Study4 TOEIC', true, true, 2)
         RETURNING id`,
      );
      dictCourseId = ins.rows[0].id;
    }

    const maxModRes = await client.query(
      'SELECT COALESCE(MAX(display_order), 0)::int AS max_order FROM modules WHERE course_id = $1',
      [dictCourseId],
    );
    let nextModOrder = maxModRes.rows[0].max_order + 1;

    let importedDictModules = 0;
    let importedDictLessons = 0;
    let importedDictQuestions = 0;
    const dictationQuizMap = new Map();

    for (let tIdx = 0; tIdx < tests.length; tIdx++) {
      const t = tests[tIdx];
      const modTitle = `Study4 ${t.title} (Nghe Chép Chính Tả)`;
      const existingMod = await client.query(
        'SELECT id, display_order FROM modules WHERE course_id = $1 AND title = $2 LIMIT 1',
        [dictCourseId, modTitle],
      );

      const modOrder = tIdx - tests.length;
      if (existingMod.rows.length > 0) {
        const oldModId = existingMod.rows[0].id;
        const oldQuizRows = await client.query(
          'SELECT id, display_order, title FROM quizzes WHERE module_id = $1 ORDER BY display_order',
          [oldModId],
        );
        const oldQuizIds = oldQuizRows.rows.map((r) => r.id);
        if (oldQuizIds.length > 0) {
          const att = await client.query(
            'SELECT COUNT(*)::int AS cnt FROM user_quiz_results WHERE quiz_id = ANY($1::int[])',
            [oldQuizIds],
          );
          if (att.rows[0].cnt > 0 || oldQuizRows.rows.length === 4) {
            await client.query('UPDATE modules SET display_order = $1 WHERE id = $2', [modOrder, oldModId]);
            for (const qz of oldQuizRows.rows) {
              dictationQuizMap.set(`${t.title}::part${qz.display_order}`, {
                quizId: qz.id,
                title: qz.title,
                partNumber: qz.display_order,
                tIdx,
              });
            }
            console.log(`  [Dictation] Updating order for "${modTitle}" (already imported).`);
            continue;
          }
          await deleteQuizIds(client, oldQuizIds);
        }
        await client.query('DELETE FROM lessons WHERE module_id = $1', [oldModId]);
        await client.query('DELETE FROM modules WHERE id = $1', [oldModId]);
      }

      const modInsert = await client.query(
        `INSERT INTO modules (course_id, title, description, display_order, is_free, is_published)
         VALUES ($1, $2, $3, $4, true, true)
         RETURNING id`,
        [
          dictCourseId,
          modTitle,
          `4 bài luyện nghe chép chính tả Part 1-4 trích từ ${t.title}.`,
          modOrder,
        ],
      );
      const modId = modInsert.rows[0].id;
      importedDictModules++;

      // Prepare 4 Dictation Quizzes/Lessons for Parts 1..4
      const p1Items = t.questions
        .filter((q) => q.partNumber === 1)
        .map((q, idx) => {
          const optTexts = ['A', 'B', 'C', 'D']
            .map((L) => ({ letter: L, text: q.parsedTranscript?.options?.[L] || '' }))
            .filter((o) => o.text);
          const allTexts = optTexts.map((o) => o.text);
          return {
            displayOrder: idx + 1,
            questionText: 'Audio dictation',
            questionType: 'part1',
            imageUrl: q.imageUrl,
            audioUrl: q.audioUrl,
            transcript: q.transcriptText,
            translation: q.translationText,
            explanation: q.explanationText || null,
            keywords: extractDictationKeywords(allTexts, 6),
            answers: optTexts.map((o, i) => ({
              text: o.text,
              isCorrect: true,
              displayOrder: i + 1,
            })),
          };
        });

      const p2Items = t.questions
        .filter((q) => q.partNumber === 2)
        .map((q, idx) => {
          const prompt = q.parsedTranscript?.prompt || '';
          const optTexts = ['A', 'B', 'C']
            .map((L) => ({ letter: L, text: q.parsedTranscript?.options?.[L] || '' }))
            .filter((o) => o.text);
          const allTexts = [prompt, ...optTexts.map((o) => o.text)].filter(Boolean);
          return {
            displayOrder: idx + 1,
            questionText: prompt || 'Audio dictation',
            questionType: 'part2',
            imageUrl: null,
            audioUrl: q.audioUrl,
            transcript: q.transcriptText,
            translation: q.translationText,
            explanation: q.explanationText || null,
            keywords: extractDictationKeywords(allTexts, 6),
            answers: optTexts.map((o, i) => ({
              text: o.text,
              isCorrect: true,
              displayOrder: i + 1,
            })),
          };
        });

      const buildGroupDictationItems = (partNum) => {
        const byGroup = new Map();
        for (const q of t.questions.filter((x) => x.partNumber === partNum)) {
          const gid = q.groupId || `q-${q.questionNumber}`;
          if (!byGroup.has(gid)) byGroup.set(gid, q);
        }
        return [...byGroup.values()].map((grpQ, idx) => {
          const sentences = splitEnglishTranscriptSentences(grpQ.transcriptText);
          return {
            displayOrder: idx + 1,
            questionText: 'Audio dictation',
            questionType: `part${partNum}`,
            imageUrl: grpQ.imageUrl || null,
            audioUrl: grpQ.audioUrl,
            transcript: grpQ.transcriptText,
            translation: grpQ.groupTranslationText || grpQ.translationText || null,
            explanation: null,
            keywords: extractDictationKeywords(sentences, 8),
            answers: sentences.map((s, i) => ({
              text: s,
              isCorrect: true,
              displayOrder: i + 1,
            })),
          };
        });
      };

      const p3Items = buildGroupDictationItems(3);
      const p4Items = buildGroupDictationItems(4);

      const lessonSpecs = [
        {
          title: `Part 1: Mô tả tranh (${p1Items.length} câu)`,
          items: p1Items,
          order: 1,
        },
        {
          title: `Part 2: Hỏi - Đáp (${p2Items.length} câu)`,
          items: p2Items,
          order: 2,
        },
        {
          title: `Part 3: Hội thoại ngắn (${p3Items.length} bài nghe)`,
          items: p3Items,
          order: 3,
        },
        {
          title: `Part 4: Bài nói ngắn (${p4Items.length} bài nghe)`,
          items: p4Items,
          order: 4,
        },
      ];

      for (const spec of lessonSpecs) {
        const qzInsert = await client.query(
          `INSERT INTO quizzes (module_id, title, total_questions, time_limit_seconds, display_order, audio_url, is_free)
           VALUES ($1, $2, $3, 1800, $4, $5, true)
           RETURNING id`,
          [modId, `${t.title} - ${spec.title}`, spec.items.length, spec.order, t.mainAudioUrl],
        );
        const quizId = qzInsert.rows[0].id;
        dictationQuizMap.set(`${t.title}::part${spec.order}`, {
          quizId,
          title: `${t.title} - ${spec.title}`,
          partNumber: spec.order,
          tIdx,
        });

        await client.query(
          `INSERT INTO lessons (module_id, title, video_url, duration_seconds, display_order, is_live, lesson_type, quiz_id, is_free, is_published)
           VALUES ($1, $2, NULL, 600, $3, false, 'dictation', $4, true, true)`,
          [modId, spec.title, spec.order, quizId],
        );
        importedDictLessons++;

        for (const item of spec.items) {
          const qInsert = await client.query(
            `INSERT INTO questions (
               quiz_id, question_text, question_type, image_url, audio_url, display_order,
               translation, dictation_keywords, explanation, transcript,
               toeic_part, part_index, practice_eligible
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)
             RETURNING id`,
            [
              quizId,
              item.questionText,
              item.questionType,
              item.imageUrl || null,
              item.audioUrl || null,
              item.displayOrder,
              item.translation || null,
              item.keywords || null,
              item.explanation || null,
              item.transcript || null,
              Number(item.questionType.replace('part', '')),
              item.displayOrder,
            ],
          );
          const qid = qInsert.rows[0].id;
          importedDictQuestions++;

          for (const ans of item.answers) {
            await client.query(
              `INSERT INTO answers (question_id, answer_text, is_correct, display_order)
               VALUES ($1, $2, $3, $4)`,
              [qid, ans.text, ans.isCorrect, ans.displayOrder],
            );
          }
        }
      }
    }

    // Helper to idempotently link a quiz into a target module
    async function upsertModuleLesson(moduleId, title, quizId, lessonType, displayOrder) {
      const existingLesson = await client.query(
        'SELECT id FROM lessons WHERE module_id = $1 AND (quiz_id = $2 OR title = $3) LIMIT 1',
        [moduleId, quizId, title],
      );
      if (existingLesson.rows.length > 0) {
        await client.query(
          `UPDATE lessons
             SET title = $1, quiz_id = $2, lesson_type = $3, display_order = $4, is_free = true, is_published = true, is_live = false
           WHERE id = $5`,
          [title, quizId, lessonType, displayOrder, existingLesson.rows[0].id],
        );
      } else {
        await client.query(
          `INSERT INTO lessons (module_id, title, video_url, duration_seconds, display_order, is_live, lesson_type, quiz_id, is_free, is_published)
           VALUES ($1, $2, NULL, 600, $3, false, $4, $5, true, true)`,
          [moduleId, title, displayOrder, lessonType, quizId],
        );
      }
    }

    // Link Study4 dictation quizzes into Course 3's part1 / part-2 / part 3+ 4 modules
    const dictExistingMods = await client.query(
      'SELECT id, title FROM modules WHERE course_id = $1',
      [dictCourseId],
    );
    const dictModsByKey = new Map();
    for (const m of dictExistingMods.rows) {
      dictModsByKey.set(m.title.trim().toLowerCase(), m.id);
    }
    const c3Part1ModId = dictModsByKey.get('part1');
    const c3Part2ModId = dictModsByKey.get('part-2');
    const c3Part34ModId = dictModsByKey.get('part 3+ 4');
    let linkedCourse3Lessons = 0;

    for (let tIdx = 0; tIdx < tests.length; tIdx++) {
      const t = tests[tIdx];
      for (const partNum of [1, 2, 3, 4]) {
        const entry = dictationQuizMap.get(`${t.title}::part${partNum}`);
        if (!entry) continue;
        const targetModId =
          partNum === 1 ? c3Part1ModId : partNum === 2 ? c3Part2ModId : c3Part34ModId;
        if (!targetModId) continue;
        const lessonTitle = `Study4 ${t.title} - Part ${partNum}`;
        const displayOrder = -(tests.length - tIdx) * 10 + partNum;
        await upsertModuleLesson(targetModId, lessonTitle, entry.quizId, 'dictation', displayOrder);
        linkedCourse3Lessons++;
      }
    }

    // Link Study4 Part 1-4 section quizzes into Course 1 (video_quiz) PART 1..4 modules
    const videoCourseRes = await client.query(
      "SELECT id FROM courses WHERE course_type = 'video_quiz' ORDER BY id LIMIT 1",
    );
    let linkedCourse1Lessons = 0;
    if (videoCourseRes.rows.length > 0) {
      const videoCourseId = videoCourseRes.rows[0].id;
      const c1ModsRes = await client.query(
        'SELECT id, title FROM modules WHERE course_id = $1',
        [videoCourseId],
      );
      const c1PartModMap = new Map();
      for (const m of c1ModsRes.rows) {
        const match = m.title.match(/^PART\s*([1-4])\b/i);
        if (match) c1PartModMap.set(Number(match[1]), m.id);
      }
      for (let tIdx = 0; tIdx < tests.length; tIdx++) {
        const t = tests[tIdx];
        for (const partNum of [1, 2, 3, 4]) {
          const quizId = sectionQuizMap.get(`${t.title}::part${partNum}`);
          const targetModId = c1PartModMap.get(partNum);
          if (!quizId || !targetModId) continue;
          const lessonTitle = `Study4 ${t.title} - Part ${partNum}`;
          const displayOrder = -(tests.length - tIdx);
          await upsertModuleLesson(targetModId, lessonTitle, quizId, 'exam', displayOrder);
          linkedCourse1Lessons++;
        }
      }
    }

    const taggedColRes = await client.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'tagged_at') AS has_col",
    );
    if (taggedColRes.rows[0]?.has_col) {
      const untaggedRes = await client.query(
        `SELECT COUNT(*)::int AS cnt
         FROM questions q
         JOIN quizzes qz ON qz.id = q.quiz_id
         JOIN full_test_sections fts ON fts.quiz_id = qz.id
         JOIN full_tests ft ON ft.id = fts.test_id
         WHERE ft.title LIKE 'TOEIC LR Collection 1%' AND q.tagged_at IS NULL`,
      );
      console.log(`  [TagCheck ${label}] Untagged Study4 FullTest questions: ${untaggedRes.rows[0].cnt}`);
    }

    await client.query('COMMIT');
    console.log(
      `[SUCCESS ${label}] FullTests=${importedFullTests} (Q=${importedFullTestQuestions}), DictationModules=${importedDictModules}, Lessons=${importedDictLessons}, DictQuestions=${importedDictQuestions}, LinkedC3=${linkedCourse3Lessons}, LinkedC1=${linkedCourse1Lessons}`,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => { });
    throw err;
  } finally {
    await client.end();
  }
}

function buildPart2CoachClusters(tests) {
  const clusters = [];

  const getKeyPhrases = (text, fallbackLabel) => {
    const clean = String(text || '')
      .split(/\s+/)
      .slice(-3)
      .join(' ')
      .replace(/[^a-zA-Z0-9\s']/g, '')
      .trim();
    return [
      {
        term: clean || fallbackLabel,
        phonetic: '/collocation/',
        meaningVi: 'Cụm từ trọng tâm',
      },
    ];
  };

  for (let tIdx = 0; tIdx < tests.length; tIdx++) {
    const t = tests[tIdx];
    const testNum = String(tIdx + 1).padStart(2, '0');

    // ---------------- PART 1 (6 câu / 1 cụm per test) ----------------
    const p1Parsed = [];
    for (const q of t.questions.filter((x) => x.partNumber === 1)) {
      const optMap = {};
      for (const L of ['A', 'B', 'C', 'D']) {
        const fromTranscript = q.parsedTranscript?.options?.[L]?.trim();
        const fromAns = q.answers?.find((a) => a.letter === L)?.text?.trim();
        const text = fromTranscript || fromAns || '';
        const trans = q.parsedExplanationVi?.options?.[L] || '';
        if (text) optMap[L] = { text, trans };
      }
      if (!q.audioUrl || !optMap.A || !optMap.B || !optMap.C || !optMap.D) continue;
      const correctLetter = ['A', 'B', 'C', 'D'].includes(q.correctLetter) ? q.correctLetter : 'A';
      const correctObj = optMap[correctLetter];
      const distractors = ['A', 'B', 'C', 'D']
        .filter((l) => l !== correctLetter)
        .map((l) => ({
          letter: l,
          text: optMap[l].text,
          translation: optMap[l].trans,
          ...classifyTrap(optMap[l].text, correctObj.text),
        }));

      p1Parsed.push({
        id: Number(q.study4Qid) || 910000 + (tIdx + 1) * 100 + q.questionNumber,
        part: 'part1',
        questionNumber: q.questionNumber,
        audioUrl: q.audioUrl,
        imageUrl: q.imageUrl || undefined,
        transcriptText: q.transcriptText || undefined,
        questionText: correctObj.text,
        questionTranslation: correctObj.trans || 'Mô tả đúng với bức tranh',
        questionStem: {
          text: 'Mô tả tranh',
          type: 'statement',
          label: 'Part 1 - Mô tả tranh',
          tip: 'Quan sát kỹ người, vật, hành động và vị trí trong ảnh trước khi nghe 4 lựa chọn A, B, C, D.',
        },
        keywordsAndCollocations: getKeyPhrases(correctObj.text, 'Picture description'),
        reflexDirection1: {
          targetMeaningVi: correctObj.trans || 'Mô tả chính xác hành động/bối cảnh trong ảnh',
          questionIntent: 'Nghe 4 câu mô tả (A-D) và đối chiếu trực tiếp với chi tiết trong ảnh',
          quickTip: 'Loại trừ ngay câu sai chủ thể, sai động từ đang diễn ra hoặc sai vị trí.',
        },
        reflexDirection2: {
          predictedDirectDirections: [correctObj.text],
          commonIndirectResponses: [
            {
              vietnamesePrompt: 'Mô tả đáp án đúng của tranh',
              englishResponse: correctObj.text,
              explanation: correctObj.trans || 'Câu mô tả chính xác bức tranh',
              category: 'doi_chu',
            },
          ],
        },
        correctChoice: {
          letter: correctLetter,
          text: correctObj.text,
          translation: correctObj.trans,
          connectedSpeechNotes: [
            {
              segment: correctObj.text.split(/\s+/).slice(0, 3).join(' '),
              phoneticSpelling: 'Connected speech',
              type: 'linking',
              explanation: 'Chú ý động từ V-ing / bị động và giới từ chỉ vị trí trong câu mô tả tranh.',
            },
          ],
        },
        distractors,
      });
    }
    if (p1Parsed.length > 0) {
      const startQ = p1Parsed[0].questionNumber;
      const endQ = p1Parsed[p1Parsed.length - 1].questionNumber;
      clusters.push({
        id: `study4-c1-t${tIdx + 1}-p1-q${startQ}-q${endQ}`,
        part: 'part1',
        title: `Study4 Collection 1 - Test ${testNum} (Part 1): Câu ${startQ} – ${endQ}`,
        description: `Luyện nghe mô tả tranh Part 1 (${p1Parsed.length} câu) từ ${t.title} kèm ảnh và transcript chi tiết.`,
        testSource: `Study4 ${t.title}`,
        difficulty: 'Cơ bản (500+)',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        sourceType: 'fulltest',
        questions: p1Parsed,
      });
    }

    // ---------------- PART 2 (25 câu / 5 cụm per test) ----------------
    const p2Questions = t.questions.filter((q) => q.partNumber === 2);
    const parsedQuestions = [];
    for (const q of p2Questions) {
      const prompt = q.parsedTranscript?.prompt?.trim();
      const cA = q.parsedTranscript?.options?.A?.trim();
      const cB = q.parsedTranscript?.options?.B?.trim();
      const cC = q.parsedTranscript?.options?.C?.trim();
      if (!prompt || !cA || !cB || !cC || !q.audioUrl) continue;

      const correctLetter = ['A', 'B', 'C'].includes(q.correctLetter) ? q.correctLetter : 'A';
      const stem = extractStem(prompt);
      const choices = {
        A: { text: cA, trans: q.parsedExplanationVi?.options?.A || '' },
        B: { text: cB, trans: q.parsedExplanationVi?.options?.B || '' },
        C: { text: cC, trans: q.parsedExplanationVi?.options?.C || '' },
      };
      const correctChoiceObj = choices[correctLetter];
      const distractors = ['A', 'B', 'C']
        .filter((l) => l !== correctLetter)
        .map((l) => ({
          letter: l,
          text: choices[l].text,
          translation: choices[l].trans,
          ...classifyTrap(choices[l].text, prompt),
        }));

      const qTrans = q.parsedExplanationVi?.prompt || 'Dịch nghĩa câu hỏi';
      const lastTwoWords = prompt
        .split(/\s+/)
        .slice(-2)
        .join(' ')
        .replace(/[^a-zA-Z\s']/g, '')
        .trim();

      parsedQuestions.push({
        id: Number(q.study4Qid) || 900000 + (tIdx + 1) * 100 + q.questionNumber,
        part: 'part2',
        questionNumber: q.questionNumber,
        audioUrl: q.audioUrl,
        transcriptText: q.transcriptText || undefined,
        questionText: prompt,
        questionTranslation: qTrans,
        questionStem: stem,
        keywordsAndCollocations: [
          {
            term: lastTwoWords || stem.text,
            phonetic: '/collocation/',
            meaningVi: 'Cụm từ trọng tâm câu hỏi',
          },
        ],
        reflexDirection1: {
          targetMeaningVi: qTrans,
          questionIntent: `Xác định thông tin cho dạng ${stem.label}`,
          quickTip: `Nghe "${stem.text}" ➔ Bật ngay trọng tâm ${stem.label}!`,
        },
        reflexDirection2: {
          predictedDirectDirections: [
            correctChoiceObj.text,
            'I have no idea at the moment.',
            'Please ask the manager.',
          ],
          commonIndirectResponses: [
            {
              vietnamesePrompt: 'Tôi không chắc lắm',
              englishResponse: 'I’m not entirely sure.',
              explanation: 'Dạng né tránh thông tin',
              category: 'khong_biet',
            },
            {
              vietnamesePrompt: 'Hỏi người phụ trách xem',
              englishResponse: 'Check with the supervisor.',
              explanation: 'Dạng chuyển giao trách nhiệm',
              category: 'hoi_nguoi_khac',
            },
          ],
        },
        correctChoice: {
          letter: correctLetter,
          text: correctChoiceObj.text,
          translation: correctChoiceObj.trans,
          connectedSpeechNotes: [
            {
              segment: prompt.split(/\s+/).slice(0, 3).join(' '),
              phoneticSpelling: 'Connected speech',
              type: 'linking',
              explanation: 'Nối âm nhanh các từ đầu câu tạo thành một chuỗi âm tiết',
            },
          ],
        },
        distractors,
      });
    }

    for (let i = 0; i < parsedQuestions.length; i += 5) {
      const chunk = parsedQuestions.slice(i, i + 5);
      if (chunk.length < 3) continue;
      const startQ = chunk[0].questionNumber;
      const endQ = chunk[chunk.length - 1].questionNumber;
      clusters.push({
        id: `study4-c1-t${tIdx + 1}-q${startQ}-q${endQ}`,
        part: 'part2',
        title: `Study4 Collection 1 - Test ${testNum}: Câu ${startQ} – ${endQ}`,
        description: `Luyện nghe phản xạ từng bước 5 câu Part 2 từ ${t.title} (Audio chuẩn Study4).`,
        testSource: `Study4 ${t.title}`,
        difficulty: i === 0 ? 'Cơ bản (500+)' : i < 15 ? 'Trung cấp (650+)' : 'Nâng cao (800+)',
        badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        sourceType: 'fulltest',
        questions: chunk,
      });
    }

    // ---------------- PART 3 & PART 4 (grouped by conversation/talk) ----------------
    const buildGroupPartClusters = (partNum, groupSizes, difficultyLabel, badgeColor) => {
      const partKey = `part${partNum}`;
      const rawQs = t.questions.filter((q) => q.partNumber === partNum);
      const parsed = [];
      const groups = [];
      const groupMap = new Map();

      for (let idx = 0; idx < rawQs.length; idx++) {
        const q = rawQs[idx];
        const prompt = q.questionText?.trim();
        const optMap = {};
        for (const L of ['A', 'B', 'C', 'D']) {
          const fromAns = q.answers?.find((a) => a.letter === L)?.text?.trim();
          const fromTranscript = q.parsedTranscript?.options?.[L]?.trim();
          const text = fromAns || fromTranscript || '';
          const trans = q.parsedExplanationVi?.options?.[L] || '';
          if (text) optMap[L] = { text, trans };
        }
        if (!prompt || !q.audioUrl || !optMap.A || !optMap.B || !optMap.C || !optMap.D) continue;

        const correctLetter = ['A', 'B', 'C', 'D'].includes(q.correctLetter) ? q.correctLetter : 'A';
        const correctObj = optMap[correctLetter];
        const stem = extractStem(prompt);
        const qTrans = q.parsedExplanationVi?.prompt || 'Dịch nghĩa câu hỏi';
        const distractors = ['A', 'B', 'C', 'D']
          .filter((l) => l !== correctLetter)
          .map((l) => ({
            letter: l,
            text: optMap[l].text,
            translation: optMap[l].trans,
            ...classifyTrap(optMap[l].text, prompt),
          }));

        const item = {
          id: Number(q.study4Qid) || 900000 + partNum * 10000 + (tIdx + 1) * 100 + q.questionNumber,
          part: partKey,
          questionNumber: q.questionNumber,
          audioUrl: q.audioUrl,
          imageUrl: q.imageUrl || undefined,
          transcriptText: q.transcriptText || undefined,
          passageTranslation: q.groupTranslationText || undefined,
          questionText: prompt,
          questionTranslation: qTrans,
          questionStem: stem,
          keywordsAndCollocations: getKeyPhrases(prompt, stem.text),
          reflexDirection1: {
            targetMeaningVi: qTrans,
            questionIntent: `Bắt từ khóa câu hỏi Part ${partNum}: ${stem.label}`,
            quickTip: `Đọc trước câu hỏi và 4 đáp án A-D, tập trung bắt từ khóa paraphrase trong audio.`,
          },
          reflexDirection2: {
            predictedDirectDirections: [correctObj.text],
            commonIndirectResponses: [
              {
                vietnamesePrompt: 'Thông tin chính trong đoạn audio',
                englishResponse: correctObj.text,
                explanation: correctObj.trans || 'Đáp án khớp thông tin bài nghe',
                category: 'doi_chu',
              },
            ],
          },
          correctChoice: {
            letter: correctLetter,
            text: correctObj.text,
            translation: correctObj.trans,
            connectedSpeechNotes: [
              {
                segment: correctObj.text.split(/\s+/).slice(0, 3).join(' '),
                phoneticSpelling: 'Paraphrase',
                type: 'reduction',
                explanation: 'Chú ý cách diễn đạt tương đương (paraphrase) giữa audio và đáp án đúng.',
              },
            ],
          },
          distractors,
        };

        parsed.push(item);
        const gKey = q.groupId || `${partKey}-g-${Math.floor(idx / 3)}`;
        if (!groupMap.has(gKey)) {
          const arr = [];
          groupMap.set(gKey, arr);
          groups.push(arr);
        }
        groupMap.get(gKey).push(item);
      }

      let gCursor = 0;
      for (let sIdx = 0; sIdx < groupSizes.length && gCursor < groups.length; sIdx++) {
        const size = groupSizes[sIdx];
        const sliceGroups = groups.slice(gCursor, gCursor + size);
        gCursor += size;
        const chunk = sliceGroups.flat();
        if (chunk.length === 0) continue;
        const startQ = chunk[0].questionNumber;
        const endQ = chunk[chunk.length - 1].questionNumber;
        const partLabel = partNum === 3 ? 'Hội thoại ngắn' : 'Bài nói ngắn';
        clusters.push({
          id: `study4-c1-t${tIdx + 1}-p${partNum}-q${startQ}-q${endQ}`,
          part: partKey,
          title: `Study4 Collection 1 - Test ${testNum} (Part ${partNum}): Câu ${startQ} – ${endQ}`,
          description: `Luyện nghe Part ${partNum} (${partLabel} · ${chunk.length} câu) từ ${t.title} (Audio chuẩn Study4).`,
          testSource: `Study4 ${t.title}`,
          difficulty: sIdx === 0 ? 'Cơ bản (500+)' : difficultyLabel,
          badgeColor,
          sourceType: 'fulltest',
          questions: chunk,
        });
      }
    };

    buildGroupPartClusters(
      3,
      [2, 2, 2, 2, 2, 3],
      'Trung cấp (650+)',
      'bg-violet-500/10 text-violet-400 border-violet-500/20',
    );
    buildGroupPartClusters(
      4,
      [2, 2, 2, 2, 2],
      'Nâng cao (800+)',
      'bg-amber-500/10 text-amber-400 border-amber-500/20',
    );
  }
  return clusters;
}

function updatePart2CoachFile(newClusters) {
  const filePath = path.resolve('src/data/part2CoachData.ts');
  const src = fs.readFileSync(filePath, 'utf8');
  const marker = 'export const PART2_CLUSTERS: Part2Cluster[] = ';
  const markerIdx = src.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error('Could not find export const PART2_CLUSTERS in src/data/part2CoachData.ts');
  }

  const prefix = src.slice(0, markerIdx + marker.length);
  const arrayJsonStr = src.slice(markerIdx + marker.length).trim().replace(/;\s*$/, '');
  const existingClusters = JSON.parse(arrayJsonStr);
  const keptExisting = existingClusters.filter((c) => !String(c.id || '').startsWith('study4-'));

  const combined = [...newClusters, ...keptExisting];
  const updated = `${prefix}${JSON.stringify(combined, null, 2)};\n`;
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(
    `\n[Part2Coach] Updated ${filePath}: added ${newClusters.length} Study4 clusters (${newClusters.reduce((s, c) => s + c.questions.length, 0)} questions), kept ${keptExisting.length} existing clusters.`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input;
  if (!inputPath || !fs.existsSync(inputPath)) {
    throw new Error(`Missing crawled JSON file: pass --input=<path>`);
  }
  const crawled = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const tests = crawled.tests || [];
  if (tests.length === 0) throw new Error('No tests found in crawled JSON.');

  const rootEnv = loadEnvFile(path.resolve('.env'));
  const beEnv = loadEnvFile(path.resolve('backend/.env'));

  if (!args['skip-db']) {
    if (rootEnv.DATABASE_URL) {
      await importIntoDatabase('Neon (DATABASE_URL)', rootEnv.DATABASE_URL, tests);
    }
    if (rootEnv.SUPABASE_POOLER_UR) {
      try {
        await importIntoDatabase('Supabase Pooler (SUPABASE_POOLER_UR)', rootEnv.SUPABASE_POOLER_UR, tests);
      } catch (e) {
        console.warn(`Supabase Pooler skipped/failed: ${e.message}`);
      }
    }
    if (beEnv.DATABASE_URL && beEnv.DATABASE_URL !== rootEnv.DATABASE_URL) {
      try {
        await importIntoDatabase('Backend DB (backend/.env)', beEnv.DATABASE_URL, tests);
      } catch (e) {
        console.warn(`Backend local DB unreachable (${e.message || 'connection error'}), skipping.`);
      }
    }
  }

  if (!args['skip-part2-coach']) {
    const clusters = buildPart2CoachClusters(tests);
    updatePart2CoachFile(clusters);
  }
}

main().catch((err) => {
  console.error('IMPORT ERROR:', err);
  process.exit(1);
});
