import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Client } = require(path.resolve("backend/node_modules/pg"));

const DEFAULT_SCRATCH_DIR =
  "C:\\Users\\lenovo\\.gemini\\antigravity\\brain\\beae4ac4-fba9-4c1f-b1c0-8f32215b87a0\\scratch";
const INPUT_PATH =
  process.env.DAUENGLISH_VOCAB_IN ||
  path.join(DEFAULT_SCRATCH_DIR, "dauenglish-vocab-all.json");

const COURSE_TITLE = "Kho Từ Vựng TOEIC Toàn Diện";
const COURSE_SUBTITLE =
  "600 Essential Words, Crack Vol 1–2, Hacker Vocab, ETS & Từ vựng trọng tâm Part 1–7";
const COURSE_DESCRIPTION =
  "Trọn bộ từ vựng TOEIC theo chủ đề & đề thi: 600 Essential Words, Hacker Vocab, Crack Vol 1 & 2, ETS 2023–2026, Từ vựng trọng tâm Part 1–7 kèm phát âm US/UK, hình ảnh minh họa và cụm từ.";

const SET_TITLE_MAP = {
  "600 Essential Words": "600 Essential Words for TOEIC",
  "2019-2026": "Từ vựng trọng tâm 2019–2026",
  "Crack Vol 1": "Bộ từ vựng Crack Vol 1",
  "Crack Vol 2": "Bộ từ vựng Crack Vol 2",
  "Hacker Vocab": "Hacker TOEIC Vocabulary",
  "2026": "Từ vựng ETS 2026",
  "2024": "Từ vựng ETS 2024",
  "2023": "Từ vựng ETS 2023",
};

const SET_ORDER = [
  "600 Essential Words",
  "2019-2026",
  "Crack Vol 1",
  "Crack Vol 2",
  "Hacker Vocab",
  "2026",
  "2024",
  "2023",
];

function loadEnv() {
  const env = {};
  if (!fs.existsSync(".env")) return env;
  const text = fs.readFileSync(".env", "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function wordKey(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateStr(val, max) {
  if (!val) return null;
  const s = String(val).replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function inferToeicPart(testName, partName) {
  for (const s of [partName, testName]) {
    const m = String(s || "").match(/Part\s*([1-7])/i);
    if (m) return Number(m[1]);
  }
  return null;
}

function mapLevel(difficultyLevel) {
  const d = Number(difficultyLevel);
  if (d >= 3) return "advanced";
  if (d === 2) return "intermediate";
  return "basic";
}

function formatDefinitionVi(w) {
  const meanings = Array.isArray(w.meanings) ? w.meanings : [];
  const parts = [];
  for (const m of meanings) {
    const meaning = String(m?.meaning || "").trim();
    if (!meaning) continue;
    const pos = String(m?.part_of_speech || "").trim();
    parts.push(pos ? `(${pos}) ${meaning}` : meaning);
  }
  return parts.join("; ");
}

function formatExample(w) {
  const meanings = Array.isArray(w.meanings) ? w.meanings : [];
  for (const m of meanings) {
    const ex = String(m?.example || "").trim();
    if (!ex) continue;
    const exVi = String(m?.example_vi || "").trim();
    return exVi ? `${ex} — ${exVi}` : ex;
  }
  return null;
}

function formatNotes(w) {
  const sections = [];
  const phrases = Array.isArray(w.phrases) ? w.phrases : [];
  if (phrases.length > 0) {
    const top = phrases
      .slice(0, 3)
      .map((p) => {
        const ph = String(p?.phrase || "").trim();
        const mn = String(p?.meaning || "").trim();
        return ph && mn ? `${ph} (${mn})` : ph;
      })
      .filter(Boolean);
    if (top.length > 0) sections.push(`Cụm từ: ${top.join("; ")}`);
  }

  const synonyms = Array.isArray(w.synonyms) ? w.synonyms : [];
  if (synonyms.length > 0) {
    const topSyn = synonyms.slice(0, 3).map((s) => String(s || "").trim()).filter(Boolean);
    if (topSyn.length > 0) sections.push(`Đồng nghĩa: ${topSyn.join(", ")}`);
  }

  const meanings = Array.isArray(w.meanings) ? w.meanings : [];
  const wf = [];
  let tip = "";
  for (const m of meanings) {
    if (Array.isArray(m?.word_family)) {
      for (const item of m.word_family) {
        const s = String(item || "").trim();
        if (s && !wf.includes(s)) wf.push(s);
      }
    }
    if (!tip && m?.toeic_tip) {
      tip = String(m.toeic_tip).trim();
    }
  }
  if (wf.length > 0) sections.push(`Gia đình từ: ${wf.slice(0, 3).join("; ")}`);
  if (tip) sections.push(`Mẹo TOEIC: ${tip}`);

  return sections.length > 0 ? sections.join(" | ") : null;
}

function pickWrongAnswers(correctDef, idx, quizDefs, categoryDefs, globalDefs) {
  const picked = [];
  const tryPool = (pool, step) => {
    if (!pool.length) return;
    const len = pool.length;
    for (let k = 1; k <= Math.min(len * 2, 40) && picked.length < 3; k++) {
      const candidate = pool[(idx + k * step) % len];
      if (candidate && candidate !== correctDef && !picked.includes(candidate)) {
        picked.push(candidate);
      }
    }
  };
  tryPool(quizDefs, 7);
  if (picked.length < 3) tryPool(categoryDefs, 13);
  if (picked.length < 3) tryPool(globalDefs, 17);
  while (picked.length < 3) {
    picked.push(["Không xác định", "Hành động khác", "Tình huống khác"][picked.length]);
  }
  return picked;
}

function buildStructuredData(rawData, toeic600Entries) {
  const sets = Array.isArray(rawData.sets) ? rawData.sets : [];
  const setById = new Map(sets.map((s) => [s.id, s]));
  const tests = Array.isArray(rawData.tests) ? rawData.tests : [];

  const categoryMap = new Map();
  const entryMap = new Map();
  const allGlobalDefs = [];

  for (const setObj of sets) {
    const title = SET_TITLE_MAP[setObj.name] || setObj.name;
    categoryMap.set(setObj.name, {
      setName: setObj.name,
      title,
      orderIndex:
        SET_ORDER.indexOf(setObj.name) >= 0
          ? SET_ORDER.indexOf(setObj.name)
          : 50 + (setObj.order_index ?? 0),
      quizzes: [],
      defs: [],
    });
  }

  for (const test of tests) {
    const setObj = setById.get(test.set_id);
    if (!setObj) continue;
    const cat = categoryMap.get(setObj.name);
    if (!cat) continue;

    const validParts = (test.parts || []).filter(
      (p) =>
        Array.isArray(p.words) &&
        p.words.some((w) => w && w.word && w.word !== "__blocked__"),
    );
    if (validParts.length === 0) continue;

    const isSinglePart = validParts.length === 1;
    const isToeic600Set = setObj.name === "600 Essential Words";

    for (const part of validParts) {
      const words = (part.words || [])
        .filter((w) => w && w.word && w.word !== "__blocked__")
        .map((w, idx) => {
          const defVi = formatDefinitionVi(w);
          const wordStr = String(w.word || "").trim();
          const key = wordKey(wordStr);
          if (!wordStr || !defVi) return null;

          const phonetic = String(w.ipa || "").trim() || null;
          const defEn = formatNotes(w);
          const example = formatExample(w);
          const partNum = inferToeicPart(test.name, part.name);
          const level = mapLevel(w.difficulty_level);

          if (defVi) {
            cat.defs.push(defVi);
            allGlobalDefs.push(defVi);
          }

          if (key && key.length <= 60) {
            const existing = entryMap.get(key);
            const entrySource = isToeic600Set ? "toeic600" : "pack";
            if (!existing) {
              entryMap.set(key, {
                word: truncateStr(wordStr, 60),
                wordKey: key,
                phonetic: truncateStr(phonetic, 80),
                definitionVi: truncateStr(defVi, 300),
                definitionEn: truncateStr(defEn, 300),
                example: truncateStr(example, 400),
                source: entrySource,
                toeicPart: partNum,
                level,
              });
            } else {
              if (entrySource === "toeic600") existing.source = "toeic600";
              if (!existing.toeicPart && partNum) existing.toeicPart = partNum;
              if (!existing.example && example) existing.example = truncateStr(example, 400);
              if (!existing.definitionEn && defEn) existing.definitionEn = truncateStr(defEn, 300);
              if (!existing.phonetic && phonetic) existing.phonetic = truncateStr(phonetic, 80);
            }
          }

          return {
            word: wordStr,
            phonetic,
            definitionEn: defEn,
            definitionVi: defVi,
            exampleSentence: example,
            imageUrl: w.image_url || null,
            audioMaleUrl: w.audio_us || w.audio_url || w.audio_uk || null,
            audioFemaleUrl: w.audio_uk || w.audio_us || w.audio_url || null,
            displayOrder: w.order_index ?? idx + 1,
          };
        })
        .filter(Boolean);

      if (words.length === 0) continue;

      const quizTitle = isSinglePart ? test.name : `${test.name} - ${part.name}`;
      cat.quizzes.push({
        title: quizTitle,
        words,
      });
    }
  }

  // Supplement "600 Essential Words for TOEIC" with existing toeic600 bank entries
  // so students get the full 600-word set in Flashcard & Quiz mode too.
  const cat600 = categoryMap.get("600 Essential Words");
  if (cat600 && Array.isArray(toeic600Entries) && toeic600Entries.length > 0) {
    const existingKeys = new Set();
    for (const q of cat600.quizzes) {
      for (const w of q.words) {
        existingKeys.add(wordKey(w.word));
      }
    }
    const extra = toeic600Entries.filter(
      (e) => e.word_key && e.definition_vi && !existingKeys.has(e.word_key),
    );
    for (const e of extra) {
      cat600.defs.push(e.definition_vi);
      allGlobalDefs.push(e.definition_vi);
    }
    const chunkSize = 12;
    for (let i = 0; i < extra.length; i += chunkSize) {
      const chunk = extra.slice(i, i + chunkSize);
      const lessonNum = 3 + Math.floor(i / chunkSize);
      cat600.quizzes.push({
        title: `Bài ${lessonNum} (600 TOEIC)`,
        words: chunk.map((e, idx) => ({
          word: e.word,
          phonetic: e.phonetic || null,
          definitionEn: e.definition_en || null,
          definitionVi: e.definition_vi,
          exampleSentence: e.example || null,
          imageUrl: null,
          audioMaleUrl: null,
          audioFemaleUrl: null,
          displayOrder: idx + 1,
        })),
      });
    }
  }

  const orderedCategories = [...categoryMap.values()]
    .filter((c) => c.quizzes.length > 0)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const uniqueGlobalDefs = [...new Set(allGlobalDefs)];
  for (const cat of orderedCategories) {
    cat.defs = [...new Set(cat.defs)];
    for (const quiz of cat.quizzes) {
      const quizDefs = [...new Set(quiz.words.map((w) => w.definitionVi))];
      quiz.words = quiz.words.map((w, idx) => {
        const [w1, w2, w3] = pickWrongAnswers(
          w.definitionVi,
          idx,
          quizDefs,
          cat.defs,
          uniqueGlobalDefs,
        );
        return {
          ...w,
          wrongAnswer1: w1,
          wrongAnswer2: w2,
          wrongAnswer3: w3,
        };
      });
    }
  }

  return {
    categories: orderedCategories,
    entries: [...entryMap.values()],
  };
}

async function batchInsertQuestions(client, quizId, words) {
  const CHUNK = 200;
  const cols = 13;
  for (let i = 0; i < words.length; i += CHUNK) {
    const slice = words.slice(i, i + CHUNK);
    const params = [];
    const tuples = [];
    for (let rowIdx = 0; rowIdx < slice.length; rowIdx++) {
      const w = slice[rowIdx];
      const base = rowIdx * cols;
      params.push(
        quizId,
        w.word,
        w.phonetic,
        w.definitionEn,
        w.definitionVi,
        w.exampleSentence,
        w.imageUrl,
        w.audioMaleUrl,
        w.audioFemaleUrl,
        w.wrongAnswer1,
        w.wrongAnswer2,
        w.wrongAnswer3,
        w.displayOrder,
      );
      tuples.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13})`,
      );
    }
    await client.query(
      `INSERT INTO vocab_questions
        (vocab_quiz_id, word, phonetic, definition_en, definition_vi, example_sentence, image_url, audio_male_url, audio_female_url, wrong_answer_1, wrong_answer_2, wrong_answer_3, display_order)
       VALUES ${tuples.join(", ")}`,
      params,
    );
  }
}

async function upsertVocabEntries(client, entries) {
  const maxOrderRes = await client.query(
    `SELECT COALESCE(MAX(display_order), 0)::int AS max_order FROM vocab_entries`,
  );
  let nextOrder = (maxOrderRes.rows[0]?.max_order ?? 0) + 1;

  const CHUNK = 200;
  let upserted = 0;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const slice = entries.slice(i, i + CHUNK);
    const cols = 10;
    const params = [];
    const tuples = [];
    for (let rowIdx = 0; rowIdx < slice.length; rowIdx++) {
      const e = slice[rowIdx];
      const base = rowIdx * cols;
      params.push(
        e.word,
        e.wordKey,
        e.phonetic,
        e.definitionVi,
        e.definitionEn,
        e.example,
        e.source,
        e.toeicPart,
        e.level,
        nextOrder++,
      );
      tuples.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}::smallint, $${base + 9}, 0, 'auto', NOW(), $${base + 10})`,
      );
    }

    await client.query(
      `INSERT INTO vocab_entries
        (word, word_key, phonetic, definition_vi, definition_en, example, source, toeic_part, level, frequency, tag_source, tagged_at, display_order)
       VALUES ${tuples.join(", ")}
       ON CONFLICT (word_key) DO UPDATE SET
         phonetic = COALESCE(NULLIF(vocab_entries.phonetic, ''), EXCLUDED.phonetic),
         definition_vi = COALESCE(NULLIF(vocab_entries.definition_vi, ''), EXCLUDED.definition_vi),
         definition_en = COALESCE(EXCLUDED.definition_en, vocab_entries.definition_en),
         example = COALESCE(EXCLUDED.example, vocab_entries.example),
         source = CASE WHEN vocab_entries.source = 'toeic600' THEN 'toeic600' ELSE EXCLUDED.source END,
         toeic_part = CASE WHEN vocab_entries.tag_source = 'admin' OR vocab_entries.toeic_part IS NOT NULL THEN vocab_entries.toeic_part ELSE EXCLUDED.toeic_part END,
         level = CASE WHEN vocab_entries.tag_source = 'admin' OR vocab_entries.level IS NOT NULL THEN vocab_entries.level ELSE EXCLUDED.level END,
         tagged_at = COALESCE(vocab_entries.tagged_at, NOW())`,
      params,
    );
    upserted += slice.length;
  }
  return upserted;
}

async function importToDatabase(label, connectionString, structured) {
  console.log(`\n=== Importing to ${label} ===`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const tablesRes = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const tableSet = new Set(tablesRes.rows.map((r) => r.table_name));
    const cat9Res = await client.query(`SELECT id FROM course_categories WHERE id = 9`);
    const categoryIdForCourse = cat9Res.rows.length > 0 ? 9 : null;

    await client.query("BEGIN");

    // 1. Ensure free active flashcard course exists
    let courseId;
    const existingCourse = await client.query(
      `SELECT id FROM courses WHERE course_type = 'flashcard' AND title = $1 LIMIT 1`,
      [COURSE_TITLE],
    );
    if (existingCourse.rows.length > 0) {
      courseId = existingCourse.rows[0].id;
      await client.query(
        `UPDATE courses
         SET subtitle = $1, description = $2, is_free = true, is_active = true, category_id = COALESCE(category_id, $3)
         WHERE id = $4`,
        [COURSE_SUBTITLE, COURSE_DESCRIPTION, categoryIdForCourse, courseId],
      );
    } else {
      const maxOrder = await client.query(
        `SELECT COALESCE(MAX(display_order), 0)::int AS m FROM courses`,
      );
      const inserted = await client.query(
        `INSERT INTO courses (title, subtitle, description, course_type, price, is_free, is_active, display_order, category_id)
         VALUES ($1, $2, $3, 'flashcard', 0, true, true, $4, $5)
         RETURNING id`,
        [
          COURSE_TITLE,
          COURSE_SUBTITLE,
          COURSE_DESCRIPTION,
          (maxOrder.rows[0]?.m ?? 0) + 1,
          categoryIdForCourse,
        ],
      );
      courseId = inserted.rows[0].id;
    }

    // 2. Sync vocab_categories, vocab_quizzes, vocab_questions for this course only
    let totalQuizzes = 0;
    let totalWords = 0;

    for (let catIdx = 0; catIdx < structured.categories.length; catIdx++) {
      const cat = structured.categories[catIdx];
      let catId;
      const existingCat = await client.query(
        `SELECT id FROM vocab_categories WHERE course_id = $1 AND title = $2 LIMIT 1`,
        [courseId, cat.title],
      );
      if (existingCat.rows.length > 0) {
        catId = existingCat.rows[0].id;
        await client.query(
          `UPDATE vocab_categories SET display_order = $1 WHERE id = $2`,
          [catIdx + 1, catId],
        );
      } else {
        const insCat = await client.query(
          `INSERT INTO vocab_categories (course_id, title, display_order) VALUES ($1, $2, $3) RETURNING id`,
          [courseId, cat.title, catIdx + 1],
        );
        catId = insCat.rows[0].id;
      }

      // Remove existing quizzes strictly belonging to this category before re-inserting
      await client.query(`DELETE FROM vocab_quizzes WHERE category_id = $1`, [catId]);

      for (let qIdx = 0; qIdx < cat.quizzes.length; qIdx++) {
        const quiz = cat.quizzes[qIdx];
        const insQuiz = await client.query(
          `INSERT INTO vocab_quizzes (category_id, title, total_questions, display_order)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [catId, quiz.title, quiz.words.length, qIdx + 1],
        );
        const quizId = insQuiz.rows[0].id;
        await batchInsertQuestions(client, quizId, quiz.words);
        totalQuizzes++;
        totalWords += quiz.words.length;
      }
      console.log(
        `  [Category] ${cat.title}: ${cat.quizzes.length} quizzes, ${cat.quizzes.reduce((s, q) => s + q.words.length, 0)} words`,
      );
    }

    // 3. Upsert into vocab_entries if table exists in target DB
    let entriesUpserted = 0;
    if (tableSet.has("vocab_entries")) {
      entriesUpserted = await upsertVocabEntries(client, structured.entries);
      console.log(`  [vocab_entries] Upserted ${entriesUpserted} unique words.`);
    } else {
      console.log(`  [vocab_entries] Skipped (table does not exist in ${label}).`);
    }

    await client.query("COMMIT");

    const verifyCourses = await client.query(
      `SELECT id, title, course_type, is_active, is_free FROM courses WHERE id = $1`,
      [courseId],
    );
    const verifyCatCnt = await client.query(
      `SELECT COUNT(*)::int AS n FROM vocab_categories WHERE course_id = $1`,
      [courseId],
    );
    const verifyQuizCnt = await client.query(
      `SELECT COUNT(*)::int AS n FROM vocab_quizzes vq JOIN vocab_categories vc ON vc.id = vq.category_id WHERE vc.course_id = $1`,
      [courseId],
    );
    const verifyQuestionCnt = await client.query(
      `SELECT COUNT(*)::int AS n FROM vocab_questions q JOIN vocab_quizzes vq ON vq.id = q.vocab_quiz_id JOIN vocab_categories vc ON vc.id = vq.category_id WHERE vc.course_id = $1`,
      [courseId],
    );
    let totalEntries = null;
    if (tableSet.has("vocab_entries")) {
      const eCnt = await client.query(`SELECT COUNT(*)::int AS n FROM vocab_entries`);
      totalEntries = eCnt.rows[0].n;
    }

    console.log(`=== ${label} Import Verified ===`);
    console.log("  Course:", verifyCourses.rows[0]);
    console.log(
      `  Flashcard content: ${verifyCatCnt.rows[0].n} categories, ${verifyQuizCnt.rows[0].n} quizzes (created ${totalQuizzes}), ${verifyQuestionCnt.rows[0].n} questions (inserted ${totalWords})`,
    );
    if (totalEntries !== null) {
      console.log(`  vocab_entries total rows: ${totalEntries}`);
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

async function fetchToeic600FromNeon(databaseUrl) {
  if (!databaseUrl) return [];
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const hasTable = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vocab_entries'`,
    );
    if (hasTable.rows.length === 0) return [];
    const res = await client.query(
      `SELECT word, word_key, phonetic, definition_vi, definition_en, example
       FROM vocab_entries
       WHERE source = 'toeic600' AND definition_vi IS NOT NULL
       ORDER BY display_order ASC, id ASC`,
    );
    return res.rows;
  } finally {
    await client.end();
  }
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input file not found: ${INPUT_PATH}`);
  }
  const env = loadEnv();
  const rawData = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
  const toeic600Entries = await fetchToeic600FromNeon(env.DATABASE_URL);
  console.log(`Loaded ${toeic600Entries.length} existing toeic600 bank entries from Neon.`);

  const structured = buildStructuredData(rawData, toeic600Entries);
  console.log(
    `Prepared ${structured.categories.length} categories and ${structured.entries.length} unique vocab_entries.`,
  );

  const targets = [
    ["NEON", env.DATABASE_URL],
    ["SUPABASE_POOLER", env.SUPABASE_POOLER_UR],
  ];

  for (const [label, url] of targets) {
    if (!url) {
      console.warn(`Skipping ${label}: connection string not found in .env`);
      continue;
    }
    await importToDatabase(label, url, structured);
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
