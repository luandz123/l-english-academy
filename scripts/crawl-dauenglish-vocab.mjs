import fs from "node:fs";
import path from "node:path";

const BASE_URL = "https://odlnhfaygiotcyehuysw.supabase.co";
const API_KEY = "sb_publishable_4Gim-4AGEqRCeNXSVp8Xzw_P3_Lz8CB";
const DEFAULT_SCRATCH_DIR =
  "C:\\Users\\lenovo\\.gemini\\antigravity\\brain\\beae4ac4-fba9-4c1f-b1c0-8f32215b87a0\\scratch";
const SESSION_PATH =
  process.env.DAUENGLISH_SESSION_PATH ||
  path.join(DEFAULT_SCRATCH_DIR, "dauenglish-session.json");
const OUTPUT_PATH =
  process.env.DAUENGLISH_VOCAB_OUT ||
  path.join(DEFAULT_SCRATCH_DIR, "dauenglish-vocab-all.json");

const CONCURRENCY = Number(process.env.CONCURRENCY || 5);
const RETRIES = 3;
const CLEAN_ONLY = process.argv.includes("--clean-only");

let session = fs.existsSync(SESSION_PATH)
  ? JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"))
  : null;
let refreshPromise = null;
let rateLimited = false;

function isValidWord(w) {
  return Boolean(w && typeof w.word === "string" && w.word !== "__blocked__");
}

function isExpiringSoon(sess) {
  if (!sess?.expires_at) return false;
  return Date.now() / 1000 >= Number(sess.expires_at) - 120;
}

async function refreshSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    if (!session?.refresh_token) {
      throw new Error("Missing refresh_token in session file");
    }
    const res = await fetch(`${BASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Token refresh failed (${res.status}): ${txt}`);
    }
    const next = await res.json();
    session = {
      access_token: next.access_token,
      refresh_token: next.refresh_token || session.refresh_token,
      expires_at: next.expires_at || Math.floor(Date.now() / 1000) + (next.expires_in || 3600),
    };
    fs.writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2), "utf8");
    return session;
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function apiFetch(urlPath, { method = "GET", body = undefined } = {}) {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    if (!session?.access_token) {
      throw new Error("Missing access_token in session file");
    }
    if (isExpiringSoon(session)) {
      await refreshSession();
    }
    const headers = {
      apikey: API_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "content-profile": "public",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${BASE_URL}${urlPath}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && attempt < RETRIES) {
      await refreshSession();
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      if (attempt < RETRIES && (res.status === 429 || res.status >= 500)) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      throw new Error(`${method} ${urlPath} failed (${res.status}): ${text}`);
    }
    return res.json();
  }
}

async function fetchPartsForTest(testId) {
  return apiFetch(
    `/rest/v1/vocabulary_parts?select=id,test_id,name,order_index&test_id=eq.${encodeURIComponent(
      testId,
    )}&is_hidden=eq.false&order=order_index.asc`,
  );
}

async function fetchWordsForPart(partId) {
  const all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    if (rateLimited) break;
    const batch = await apiFetch(
      `/rest/v1/rpc/get_vocab_words_for_part_fast?offset=${offset}&limit=${limit}`,
      { method: "POST", body: { p_part_id: partId } },
    );
    if (!Array.isArray(batch)) {
      throw new Error(`Unexpected words response for part ${partId}: ${JSON.stringify(batch)}`);
    }
    if (batch.some((w) => w && w.word === "__blocked__")) {
      rateLimited = true;
      const validInBatch = batch.filter(isValidWord);
      all.push(...validInBatch);
      return { words: all, blocked: true };
    }
    all.push(...batch.filter(isValidWord));
    if (batch.length < limit) break;
    offset += limit;
  }
  return { words: all, blocked: false };
}

function cleanCachedTest(t) {
  if (!t || !t.test_id || !Array.isArray(t.parts)) return null;
  const cleanedParts = t.parts.map((p) => {
    const validWords = Array.isArray(p.words) ? p.words.filter(isValidWord) : [];
    return {
      ...p,
      words: validWords,
    };
  });
  const totalWords = cleanedParts.reduce((s, p) => s + p.words.length, 0);
  return {
    ...t,
    parts: cleanedParts,
    crawled_word_count: totalWords,
  };
}

function isTestComplete(t) {
  return Boolean(
    t &&
      Array.isArray(t.parts) &&
      t.parts.length > 0 &&
      t.parts.every((p) => Array.isArray(p.words) && p.words.length > 0),
  );
}

function loadExistingCache() {
  if (!fs.existsSync(OUTPUT_PATH)) return { sets: [], map: new Map() };
  try {
    const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
    const map = new Map();
    for (const rawTest of existing.tests || []) {
      const cleaned = cleanCachedTest(rawTest);
      if (cleaned) {
        map.set(cleaned.test_id, cleaned);
      }
    }
    return { sets: existing.sets || [], map };
  } catch {
    return { sets: [], map: new Map() };
  }
}

async function runPool(items, worker, concurrency) {
  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      if (rateLimited) break;
      const cur = items[idx++];
      await worker(cur);
    }
  });
  await Promise.all(runners);
}

function printSummary(sets, tests) {
  const summary = {};
  for (const s of sets) {
    summary[s.name] = { testsWithWords: 0, validParts: 0, emptyParts: 0, validWords: 0 };
  }
  let totalValidParts = 0;
  let totalValidWords = 0;
  for (const t of tests) {
    const sName = sets.find((s) => s.id === t.set_id)?.name || t.set_id;
    if (!summary[sName]) {
      summary[sName] = { testsWithWords: 0, validParts: 0, emptyParts: 0, validWords: 0 };
    }
    let testHasValid = false;
    for (const p of t.parts || []) {
      const count = (p.words || []).filter(isValidWord).length;
      if (count > 0) {
        testHasValid = true;
        summary[sName].validParts++;
        summary[sName].validWords += count;
        totalValidParts++;
        totalValidWords += count;
      } else {
        summary[sName].emptyParts++;
      }
    }
    if (testHasValid) summary[sName].testsWithWords++;
  }
  console.log(`\n=== Valid Data Summary: ${totalValidWords} words across ${totalValidParts} valid parts ===`);
  console.table(summary);
}

async function main() {
  const { sets: cachedSets, map: cacheMap } = loadExistingCache();

  if (CLEAN_ONLY) {
    const cleanedTests = [...cacheMap.values()].filter((t) =>
      t.parts.some((p) => p.words.length > 0),
    );
    const payload = {
      crawledAt: new Date().toISOString(),
      sets: cachedSets,
      tests: cleanedTests,
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");
    printSummary(cachedSets, cleanedTests);
    console.log(`Cleaned and saved to ${OUTPUT_PATH}`);
    return;
  }

  console.log("Fetching vocabulary catalog from dauenglish.com...");
  const catalog = await apiFetch("/rest/v1/rpc/get_vocabulary_catalog", {
    method: "POST",
    body: {},
  });

  const sets = (catalog.sets || []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const freeTests = (catalog.tests || [])
    .filter((t) => t.access_level === "free")
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  console.log(`Catalog loaded: ${sets.length} sets, ${catalog.tests?.length || 0} total tests, ${freeTests.length} free tests.`);

  const resultsByTestId = new Map();
  let completeCount = 0;

  for (const t of freeTests) {
    const cached = cacheMap.get(t.test_id);
    if (cached) {
      resultsByTestId.set(t.test_id, cached);
      if (isTestComplete(cached)) {
        completeCount++;
      }
    }
  }

  const saveProgress = () => {
    const orderedTests = freeTests
      .map((t) => resultsByTestId.get(t.test_id))
      .filter((t) => t && t.parts.some((p) => p.words.length > 0));
    const payload = {
      crawledAt: new Date().toISOString(),
      sets,
      tests: orderedTests,
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  };

  const todo = freeTests.filter((t) => !isTestComplete(resultsByTestId.get(t.test_id)));
  console.log(`Complete cached tests: ${completeCount}, Remaining/partial tests to fetch: ${todo.length}.`);

  let saveQueue = Promise.resolve();
  const queueSave = () => {
    saveQueue = saveQueue.then(() => saveProgress());
    return saveQueue;
  };

  let processed = 0;
  await runPool(
    todo,
    async (test) => {
      if (rateLimited) return;
      const existing = resultsByTestId.get(test.test_id);
      const existingPartById = new Map(
        (existing?.parts || []).filter((p) => p.words.length > 0).map((p) => [p.id, p]),
      );

      const parts = await fetchPartsForTest(test.test_id);
      const partsWithWords = [];
      for (const part of parts) {
        const cachedPart = existingPartById.get(part.id);
        if (cachedPart) {
          partsWithWords.push(cachedPart);
          continue;
        }
        if (rateLimited) {
          partsWithWords.push({ ...part, words: [] });
          continue;
        }
        const { words, blocked } = await fetchWordsForPart(part.id);
        partsWithWords.push({ ...part, words });
        if (blocked) {
          console.warn(
            `Rate-limit sentinel (__blocked__) received at ${test.name} / ${part.name}. Stopping further requests cleanly.`,
          );
          break;
        }
      }

      // Preserve any cached parts not overwritten if stopped early
      for (const part of parts) {
        if (!partsWithWords.some((pw) => pw.id === part.id)) {
          const cachedPart = existingPartById.get(part.id);
          partsWithWords.push(cachedPart || { ...part, words: [] });
        }
      }

      const totalCrawledWords = partsWithWords.reduce((s, p) => s + p.words.length, 0);
      if (totalCrawledWords > 0) {
        resultsByTestId.set(test.test_id, {
          ...test,
          parts: partsWithWords,
          crawled_word_count: totalCrawledWords,
        });
      }
      processed++;
      console.log(
        `[${completeCount + processed}/${freeTests.length}] ${test.name}: ${
          partsWithWords.filter((p) => p.words.length > 0).length
        }/${parts.length} valid parts, ${totalCrawledWords} valid words`,
      );
      if (processed % 10 === 0 || rateLimited) {
        await queueSave();
      }
    },
    CONCURRENCY,
  );

  await queueSave();
  saveProgress();

  const finalTests = freeTests
    .map((t) => resultsByTestId.get(t.test_id))
    .filter((t) => t && t.parts.some((p) => p.words.length > 0));
  printSummary(sets, finalTests);
  if (rateLimited) {
    console.log("Stopped gracefully upon server-side __blocked__ limit. Run again later to resume remaining parts.");
  }
  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Crawl failed:", err);
  process.exit(1);
});
