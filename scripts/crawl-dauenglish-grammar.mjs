import fs from "node:fs";
import path from "node:path";

const DAUENGLISH_BASE_URL = "https://odlnhfaygiotcyehuysw.supabase.co";
const DAUENGLISH_API_KEY = "sb_publishable_4Gim-4AGEqRCeNXSVp8Xzw_P3_Lz8CB";
const DAUTOEIC_BASE_URL = "https://dautoeic.vn";

const DEFAULT_SCRATCH_DIR =
  "C:\\Users\\lenovo\\.gemini\\antigravity\\brain\\beae4ac4-fba9-4c1f-b1c0-8f32215b87a0\\scratch";
const OUTPUT_PATH =
  process.env.DAUENGLISH_GRAMMAR_OUT ||
  path.join(DEFAULT_SCRATCH_DIR, "dauenglish-grammar-all.json");
const STEP_168_OUTPUT_PATH =
  "C:\\Users\\lenovo\\.gemini\\antigravity\\brain\\f2e6c019-c1db-496d-9445-3d040133a6e1\\.system_generated\\steps\\168\\output.txt";

const RETRIES = 3;
const SLEEP_MS = Number(process.env.CRAWL_SLEEP_MS || 150);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadExisting() {
  if (!fs.existsSync(OUTPUT_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveOutput(data) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function fetchWithRetry(url, { method = "GET", headers = {}, body } = {}) {
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const res = await fetch(url, { method, headers, body });
    if (res.ok) {
      return await res.text();
    }
    const txt = await res.text();
    if (attempt < RETRIES && (res.status === 429 || res.status >= 500)) {
      await sleep(attempt * 1000);
      continue;
    }
    throw new Error(`${method} ${url} failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  throw new Error(`${method} ${url} exhausted retries`);
}

function extractBalancedJson(text, startIdx, openChar = "{", closeChar = "}") {
  if (startIdx < 0 || text[startIdx] !== openChar) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIdx; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }
    if (ch === "\"") {
      inString = true;
    } else if (ch === openChar) {
      depth += 1;
    } else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIdx, i + 1);
      }
    }
  }
  return null;
}

function recoverStep168NounsQuestions() {
  if (!fs.existsSync(STEP_168_OUTPUT_PATH)) return [];
  const raw = fs.readFileSync(STEP_168_OUTPUT_PATH, "utf8");
  const marker = "### Response Body";
  const bodyIdx = raw.indexOf(marker);
  if (bodyIdx < 0) return [];

  const body = raw.slice(bodyIdx + marker.length);
  const byId = new Map();
  let searchFrom = 0;

  while (searchFrom < body.length) {
    const objStart = body.indexOf('{"id":', searchFrom);
    if (objStart < 0) break;
    const candidate = extractBalancedJson(body, objStart, "{", "}");
    if (!candidate) break;
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        typeof parsed.id === "string" &&
        typeof parsed.question_text === "string" &&
        typeof parsed.translation_vi === "string"
      ) {
        byId.set(parsed.id, parsed);
      }
    } catch {
      // Truncated or partial object near log boundary; skip cleanly.
    }
    searchFrom = objStart + candidate.length;
  }

  return Array.from(byId.values());
}

async function ensureDauEnglishCatalog(existing) {
  if (
    Array.isArray(existing?.catalog) &&
    existing.catalog.length > 0 &&
    Array.isArray(existing?.topics) &&
    existing.topics.length > 0 &&
    Array.isArray(existing?.subtopics) &&
    existing.subtopics.length > 0
  ) {
    return {
      catalog: existing.catalog,
      topics: existing.topics,
      subtopics: existing.subtopics,
    };
  }

  const headers = { apikey: DAUENGLISH_API_KEY };
  const [catalogRaw, topicsRaw, subtopicsRaw] = await Promise.all([
    fetchWithRetry(`${DAUENGLISH_BASE_URL}/rest/v1/rpc/get_grammar_catalog`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: "{}",
    }),
    fetchWithRetry(
      `${DAUENGLISH_BASE_URL}/rest/v1/grammar_topics?select=*&is_hidden=eq.false&order=order_index.asc`,
      { headers }
    ),
    fetchWithRetry(
      `${DAUENGLISH_BASE_URL}/rest/v1/grammar_subtopics?select=*&is_hidden=eq.false&order=order_index.asc`,
      { headers }
    ),
  ]);

  return {
    catalog: JSON.parse(catalogRaw),
    topics: JSON.parse(topicsRaw),
    subtopics: JSON.parse(subtopicsRaw),
  };
}

function parseJsonLdBlocks(rscText) {
  const blocks = [];
  const marker = '"__html":"';
  let pos = 0;

  while (pos < rscText.length) {
    const idx = rscText.indexOf(marker, pos);
    if (idx < 0) break;
    const strStart = idx + marker.length - 1;
    let i = strStart + 1;
    let escaped = false;
    while (i < rscText.length) {
      const ch = rscText[i];
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        break;
      }
      i += 1;
    }
    if (i < rscText.length) {
      try {
        const unescaped = JSON.parse(rscText.slice(strStart, i + 1));
        blocks.push(JSON.parse(unescaped));
      } catch {
        // Ignore malformed non-JSON-LD snippets.
      }
      pos = i + 1;
    } else {
      break;
    }
  }
  return blocks;
}

function parseLessonRsc(lessonId, rscText) {
  const secIdx = rscText.indexOf('{"sections":[');
  if (secIdx < 0) {
    throw new Error(`Missing {"sections":[ in RSC payload for lesson ${lessonId}`);
  }
  const sectionsJson = extractBalancedJson(rscText, secIdx, "{", "}");
  if (!sectionsJson) {
    throw new Error(`Unbalanced sections JSON for lesson ${lessonId}`);
  }
  const { sections } = JSON.parse(sectionsJson);
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error(`Empty sections array for lesson ${lessonId}`);
  }

  const ldBlocks = parseJsonLdBlocks(rscText);
  const breadcrumb = ldBlocks.find((b) => b?.["@type"] === "BreadcrumbList");
  const course = ldBlocks.find((b) => b?.["@type"] === "Course");

  const topicCrumb = breadcrumb?.itemListElement?.find((el) => el.position === 3);
  const lessonCrumb = breadcrumb?.itemListElement?.find((el) => el.position === 4);

  let topicId = null;
  const topicUrlMatch = String(topicCrumb?.item || "").match(/\/ngu-phap\/chu-de\/(\d+)/);
  if (topicUrlMatch) {
    topicId = Number(topicUrlMatch[1]);
  } else {
    const hrefMatch = rscText.match(/\/ngu-phap\/chu-de\/(\d+)/);
    if (hrefMatch) topicId = Number(hrefMatch[1]);
  }

  let title = course?.name || lessonCrumb?.name || "";
  if (!title) {
    const h1Match = rscText.match(/\["\$","h1",null,\{"className":"[^"]*","children":"([^"]+)"\}\]/);
    if (h1Match) title = h1Match[1];
  }

  let subtitleEn = "";
  const h1BlockIdx = rscText.indexOf('"$","h1"');
  if (h1BlockIdx >= 0) {
    const afterH1 = rscText.slice(h1BlockIdx, h1BlockIdx + 500);
    const subMatch = afterH1.match(/\["\$","p",null,\{"className":"[^"]*","children":"([^"]+)"\}\]/);
    if (subMatch) subtitleEn = subMatch[1];
  }

  let topicTitle = topicCrumb?.name || "";
  if (!topicTitle) {
    const topicBadgeMatch = rscText.match(
      /\["\$","p",null,\{"className":"text-xs font-semibold[^"]*","children":"([^"]+)"\}\]/
    );
    if (topicBadgeMatch) topicTitle = topicBadgeMatch[1];
  }

  const educationalLevel = course?.educationalLevel || null;

  return {
    id: lessonId,
    title,
    subtitleEn,
    topicTitle,
    topicId,
    educationalLevel,
    sections,
  };
}

async function discoverDautoeicLessonIds() {
  const html = await fetchWithRetry(`${DAUTOEIC_BASE_URL}/ngu-phap`);
  const ids = new Set();
  for (const match of html.matchAll(/\/ngu-phap\/bai-hoc\/(\d+)/g)) {
    ids.add(Number(match[1]));
  }
  const sorted = Array.from(ids).sort((a, b) => a - b);
  if (sorted.length === 0) {
    throw new Error("Failed to discover lesson IDs from https://dautoeic.vn/ngu-phap");
  }
  return sorted;
}

async function main() {
  const existing = loadExisting();
  const { catalog, topics, subtopics } = await ensureDauEnglishCatalog(existing);

  const recoveredNouns = recoverStep168NounsQuestions();
  const existingQuestions = existing?.questionsByTopic || {};
  const nounsMap = new Map();
  for (const q of [...(existingQuestions.nouns || []), ...recoveredNouns]) {
    if (q && typeof q.id === "string" && !q.error) {
      nounsMap.set(q.id, q);
    }
  }
  const questionsByTopic = {
    ...existingQuestions,
    ...(nounsMap.size > 0 ? { nouns: Array.from(nounsMap.values()) } : {}),
  };

  console.log(
    `Preserved dauenglish.com catalog: ${topics.length} topics, ${subtopics.length} subtopics; recovered ${nounsMap.size} complete nouns questions.`
  );

  const lessonIds = await discoverDautoeicLessonIds();
  console.log(`Discovered ${lessonIds.length} lessons on dautoeic.vn: ${lessonIds.join(", ")}`);

  const lessonMap = new Map();
  if (Array.isArray(existing?.dautoeicLessons)) {
    for (const item of existing.dautoeicLessons) {
      if (item && typeof item.id === "number" && Array.isArray(item.sections) && item.sections.length > 0) {
        lessonMap.set(item.id, item);
      }
    }
  }

  for (let i = 0; i < lessonIds.length; i += 1) {
    const lessonId = lessonIds[i];
    const cached = lessonMap.get(lessonId);
    if (cached) {
      console.log(`[${i + 1}/${lessonIds.length}] Lesson ${lessonId} (${cached.title}): cached`);
      continue;
    }

    const rscText = await fetchWithRetry(`${DAUTOEIC_BASE_URL}/ngu-phap/bai-hoc/${lessonId}`, {
      headers: { rsc: "1" },
    });
    const parsed = parseLessonRsc(lessonId, rscText);
    lessonMap.set(lessonId, parsed);
    console.log(
      `[${i + 1}/${lessonIds.length}] Lesson ${lessonId} (${parsed.title} · ${parsed.topicTitle}): ${parsed.sections.length} sections`
    );

    const orderedLessons = Array.from(lessonMap.values()).sort((a, b) => a.id - b.id);
    saveOutput({
      crawled_at: new Date().toISOString(),
      catalog,
      topics,
      subtopics,
      questionsByTopic,
      dautoeicLessons: orderedLessons,
    });

    if (i < lessonIds.length - 1 && SLEEP_MS > 0) {
      await sleep(SLEEP_MS);
    }
  }

  const orderedLessons = Array.from(lessonMap.values()).sort((a, b) => a.id - b.id);
  saveOutput({
    crawled_at: new Date().toISOString(),
    catalog,
    topics,
    subtopics,
    questionsByTopic,
    dautoeicLessons: orderedLessons,
  });

  console.log(
    `Done. Saved ${orderedLessons.length} dautoeic.vn lessons + ${topics.length} dauenglish catalog topics + ${nounsMap.size} nouns questions -> ${OUTPUT_PATH}`
  );
}

main().catch((err) => {
  console.error("Crawl failed:", err?.message || err);
  process.exit(1);
});
