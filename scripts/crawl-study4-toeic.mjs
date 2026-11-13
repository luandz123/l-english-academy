#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const DEFAULT_UA =
  process.env.STUDY4_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

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

function loadCookie(cookieFile) {
  if (process.env.STUDY4_COOKIE?.trim()) {
    return process.env.STUDY4_COOKIE.trim();
  }
  if (cookieFile && fs.existsSync(cookieFile)) {
    return fs.readFileSync(cookieFile, 'utf8').trim();
  }
  throw new Error(
    'Missing Study4 cookie. Set STUDY4_COOKIE env var or pass --cookie-file=<path>.',
  );
}

function getCookieValue(cookieStr, key) {
  const m = cookieStr.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return m ? m[1] : '';
}

function normalizeMediaUrl(url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/media/')) return `https://s4-media1.study4.com${trimmed}`;
  if (trimmed.startsWith('/')) return `https://study4.com${trimmed}`;
  return trimmed;
}

function htmlToCleanText(el) {
  if (!el) return '';
  const clone = el.cloneNode(true);
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  clone.querySelectorAll('p, li, div, tr').forEach((block) => {
    block.append('\n');
  });
  return (clone.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizePassageHtml(container) {
  if (!container) return '';
  const clone = container.cloneNode(true);
  clone.querySelectorAll('img').forEach((img) => {
    const dataSrc = img.getAttribute('data-src');
    const src = img.getAttribute('src');
    const resolved = normalizeMediaUrl(dataSrc || src);
    if (resolved) {
      img.setAttribute('src', resolved);
      img.removeAttribute('data-src');
      img.classList.remove('lazyel');
    }
  });
  return clone.innerHTML.replace(/\s+/g, ' ').trim();
}

function parseTranscriptCollapse(collapseEl) {
  if (!collapseEl) {
    return { englishText: '', vietnameseText: '' };
  }
  const nodes = [...collapseEl.childNodes];
  const enNodes = [];
  const viNodes = [];
  let inVi = false;

  for (const node of nodes) {
    if (node.nodeType === 3) {
      const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      if (inVi) viNodes.push(txt);
      else enNodes.push(txt);
      continue;
    }
    if (node.nodeType !== 1) continue;
    const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (!inVi && /^Dịch nghĩa\s*:?/i.test(txt)) {
      inVi = true;
      const remainder = txt.replace(/^Dịch nghĩa\s*:?/i, '').trim();
      if (remainder) viNodes.push(remainder);
      continue;
    }
    const cleaned = htmlToCleanText(node);
    if (!cleaned) continue;
    if (inVi) viNodes.push(cleaned);
    else enNodes.push(cleaned);
  }

  return {
    englishText: enNodes.join('\n').trim(),
    vietnameseText: viNodes.join('\n').trim(),
  };
}

function parseStructuredOptionsFromLines(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const promptLines = [];
  const options = {};
  for (const line of lines) {
    const m = line.match(/^\(([A-D])\)\s*(.+)$/);
    if (m) {
      options[m[1]] = m[2].trim();
    } else if (Object.keys(options).length === 0) {
      promptLines.push(line);
    }
  }
  return {
    prompt: promptLines.join(' ').trim(),
    options,
  };
}

function parseExplanationBlock(explEl) {
  if (!explEl) {
    return { translationText: '', explanationText: '', parsedVi: { prompt: '', options: {} } };
  }
  const nodes = [...explEl.childNodes];
  const transParts = [];
  const explParts = [];
  let mode = 'trans';

  for (const node of nodes) {
    if (node.nodeType === 3) {
      const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      if (mode === 'expl') explParts.push(txt);
      else transParts.push(txt);
      continue;
    }
    if (node.nodeType !== 1) continue;
    const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    if (/^Dịch nghĩa\s*:?/i.test(txt)) {
      mode = 'trans';
      const rest = txt.replace(/^Dịch nghĩa\s*:?/i, '').trim();
      if (rest) transParts.push(rest);
      continue;
    }
    if (/^Giải thích\s*:?/i.test(txt)) {
      mode = 'expl';
      const rest = txt.replace(/^Giải thích\s*:?/i, '').trim();
      if (rest) explParts.push(rest);
      continue;
    }
    const cleaned = htmlToCleanText(node);
    if (!cleaned) continue;
    if (mode === 'expl') explParts.push(cleaned);
    else transParts.push(cleaned);
  }

  const translationText = transParts.join('\n').trim();
  const explanationText = explParts.join('\n').trim();
  return {
    translationText,
    explanationText,
    parsedVi: parseStructuredOptionsFromLines(translationText),
  };
}

async function fetchText(url, cookie, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': DEFAULT_UA,
      Cookie: cookie,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
      ...(options.headers || {}),
    },
  });
  const body = await res.text();
  return { status: res.status, headers: res.headers, body, url: res.url };
}

function buildAudioMap(practiceHtml) {
  const doc = new JSDOM(practiceHtml).window.document;
  const audioByQid = new Map();

  for (const partEl of doc.querySelectorAll('[id^="partcontent-"]')) {
    const groups = [...partEl.querySelectorAll('.question-group-wrapper')];
    if (groups.length > 0) {
      for (const grp of groups) {
        const src = normalizeMediaUrl(
          grp.querySelector('audio source[src]')?.getAttribute('src') ||
            grp.querySelector('audio[src]')?.getAttribute('src'),
        );
        if (!src) continue;
        for (const qEl of grp.querySelectorAll('.question-wrapper[data-qid]')) {
          const qid = qEl.getAttribute('data-qid');
          if (qid) audioByQid.set(qid, src);
        }
      }
    } else {
      for (const item of partEl.querySelectorAll('.question-item-wrapper')) {
        const src = normalizeMediaUrl(
          item.querySelector('audio source[src]')?.getAttribute('src') ||
            item.querySelector('audio[src]')?.getAttribute('src'),
        );
        if (!src) continue;
        for (const qEl of item.querySelectorAll('.question-wrapper[data-qid]')) {
          const qid = qEl.getAttribute('data-qid');
          if (qid) audioByQid.set(qid, src);
        }
      }
    }
  }
  return audioByQid;
}

function parseQuestionWrapper(qEl, doc, partNumber, audioByQid, fallbackContext) {
  const qid = qEl.getAttribute('data-qid') || '';
  const numText = qEl.querySelector('.question-number strong, .question-number')?.textContent?.trim() || '';
  const questionNumber = Number.parseInt(numText, 10);

  const qTextEl = qEl.querySelector('.question-text');
  const questionText = qTextEl ? qTextEl.textContent.replace(/\s+/g, ' ').trim() : '';

  const succText = qEl.querySelector('.text-success')?.textContent?.trim() || '';
  const succMatch = succText.match(/Đáp án đúng\s*:\s*([A-D])/i);
  const inputCorrect = qEl.querySelector('input.form-check-input.correct')?.getAttribute('value')?.trim() || '';
  const correctLetter = (succMatch?.[1] || inputCorrect || '').toUpperCase();

  const answers = [];
  const checkInputs = [...qEl.querySelectorAll('.question-answers .form-check')];
  for (const [idx, chk] of checkInputs.entries()) {
    const input = chk.querySelector('input[type="radio"]');
    const label = chk.querySelector('label');
    const letter = (input?.getAttribute('value') || String.fromCharCode(65 + idx)).toUpperCase();
    let text = (label?.textContent || '').replace(/\s+/g, ' ').trim();
    text = text.replace(/^[A-D]\.\s*/, '').trim();
    answers.push({
      letter,
      text,
      isCorrect: letter === correctLetter,
      displayOrder: idx + 1,
    });
  }

  const explEl = qid ? doc.getElementById(`questionexplanation-${qid}`) : null;
  const explParsed = parseExplanationBlock(explEl);

  const audioUrl =
    (qid ? audioByQid.get(qid) : null) ||
    fallbackContext.audioUrl ||
    null;

  return {
    questionNumber,
    study4Qid: qid,
    partNumber,
    questionType: `part${partNumber}`,
    groupId: fallbackContext.groupId || null,
    imageUrl: fallbackContext.imageUrl || null,
    audioUrl,
    passageHtml: fallbackContext.passageHtml || null,
    passageTranslationText: fallbackContext.passageTranslationText || '',
    questionText,
    transcriptText: fallbackContext.transcriptText || '',
    parsedTranscript: fallbackContext.parsedTranscript || { prompt: '', options: {} },
    groupTranslationText: fallbackContext.groupTranslationText || '',
    translationText: explParsed.translationText || fallbackContext.translationText || '',
    explanationText: explParsed.explanationText || '',
    parsedExplanationVi: explParsed.parsedVi,
    correctLetter,
    answers,
  };
}

function parseDetailsHtml(detailsHtml, testMeta, partIds, audioByQid) {
  const doc = new JSDOM(detailsHtml).window.document;

  const mainAudioUrl = normalizeMediaUrl(
    doc.querySelector('audio source[src]')?.getAttribute('src') ||
      doc.querySelector('audio[src]')?.getAttribute('src'),
  );

  const parts = [];
  const questions = [];

  for (let pIdx = 0; pIdx < partIds.length; pIdx++) {
    const partNumber = pIdx + 1;
    const pid = partIds[pIdx];
    const partEl = doc.getElementById(`partcontent-${pid}`);
    if (!partEl) {
      throw new Error(`Missing #partcontent-${pid} for test ${testMeta.id}`);
    }

    const groupEls = [...partEl.querySelectorAll('.question-group-wrapper')];
    let partQuestionCount = 0;

    if (groupEls.length > 0 && (partNumber === 3 || partNumber === 4 || partNumber === 6 || partNumber === 7)) {
      for (const [gIdx, grp] of groupEls.entries()) {
        const groupId = `s4-${testMeta.id}-p${partNumber}-g${gIdx + 1}`;
        const imgEl = grp.querySelector('.context-content.context-image img');
        const groupImg = normalizeMediaUrl(imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src'));

        // For Part 6 & 7, extract non-transcript context content from left column
        let passageHtml = null;
        if (partNumber === 6 || partNumber === 7) {
          const leftCol = grp.querySelector('.question-twocols-left .context-wrapper') || grp.querySelector('.context-wrapper');
          if (leftCol) {
            const blocks = [...leftCol.querySelectorAll(':scope > .context-content:not(.context-transcript)')]
              .map((el) => normalizePassageHtml(el))
              .filter(Boolean);
            passageHtml = blocks.join('\n');
          }
        }

        const transCollapse = grp.querySelector('.context-content.context-transcript .collapse');
        const transParsed = parseTranscriptCollapse(transCollapse);

        const qItems = [...grp.querySelectorAll('.question-item-wrapper')];
        for (const qItem of qItems) {
          const qEl = qItem.querySelector('.question-wrapper[data-qid]');
          if (!qEl) continue;
          const itemImgEl = qItem.querySelector('.context-content.context-image img');
          const itemImg = normalizeMediaUrl(itemImgEl?.getAttribute('data-src') || itemImgEl?.getAttribute('src'));
          const q = parseQuestionWrapper(qEl, doc, partNumber, audioByQid, {
            groupId,
            imageUrl: itemImg || groupImg,
            passageHtml,
            passageTranslationText: partNumber === 6 || partNumber === 7 ? transParsed.vietnameseText : '',
            transcriptText: partNumber <= 4 ? transParsed.englishText : '',
            groupTranslationText: transParsed.vietnameseText || '',
            translationText: partNumber <= 4 ? transParsed.vietnameseText : '',
          });
          questions.push(q);
          partQuestionCount++;
        }
      }
    } else {
      const items = [...partEl.querySelectorAll('.question-item-wrapper')];
      for (const item of items) {
        const qEl = item.querySelector('.question-wrapper[data-qid]');
        if (!qEl) continue;
        const imgEl = item.querySelector('.context-content.context-image img');
        const imageUrl = normalizeMediaUrl(imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src'));
        const transCollapse = item.querySelector('.context-content.context-transcript .collapse');
        const transParsed = parseTranscriptCollapse(transCollapse);
        const parsedTranscript =
          partNumber === 1 || partNumber === 2
            ? parseStructuredOptionsFromLines(transParsed.englishText)
            : { prompt: '', options: {} };

        const q = parseQuestionWrapper(qEl, doc, partNumber, audioByQid, {
          groupId: null,
          imageUrl,
          passageHtml: null,
          transcriptText: transParsed.englishText,
          parsedTranscript,
          translationText: transParsed.vietnameseText,
        });
        questions.push(q);
        partQuestionCount++;
      }
    }

    parts.push({ partNumber, study4PartId: pid, questionCount: partQuestionCount });
  }

  questions.sort((a, b) => a.questionNumber - b.questionNumber);

  return {
    id: testMeta.id,
    slug: testMeta.slug,
    title: testMeta.title,
    url: testMeta.url,
    mainAudioUrl,
    parts,
    totalQuestions: questions.length,
    questions,
  };
}

async function fetchOrReuseDetails(testMeta, partIds, cookie, cacheDir) {
  const cachedFile = cacheDir ? path.join(cacheDir, `full_details_${testMeta.id}.html`) : null;
  if (cachedFile && fs.existsSync(cachedFile)) {
    return fs.readFileSync(cachedFile, 'utf8');
  }

  const startUrl = `https://study4.com/tests/${testMeta.id}/start/`;
  const startRes = await fetchText(startUrl, cookie, { redirect: 'manual' });
  if (startRes.status !== 200) {
    throw new Error(`SKIP_GATED: Start GET ${startUrl} returned HTTP ${startRes.status}`);
  }
  const sDoc = new JSDOM(startRes.body).window.document;
  const csrf =
    sDoc.querySelector('input[name="csrfmiddlewaretoken"]')?.getAttribute('value') ||
    getCookieValue(cookie, 'csrftoken');
  const uid = sDoc.querySelector('input[name="uid"]')?.getAttribute('value') || '';
  const firstQid = sDoc.querySelector('[data-qid]')?.getAttribute('data-qid');

  if (!csrf || !firstQid) {
    throw new Error(`Could not extract csrf/firstQid from ${startUrl} (maybe not logged in?)`);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const form = new URLSearchParams();
  form.set('csrfmiddlewaretoken', csrf);
  form.set('start_time', String(nowSec - 60));
  form.set('end_time', String(nowSec));
  form.set('time_limit', '120.0');
  form.set('timeleft_value', '119.0');
  if (uid) form.set('uid', uid);
  form.set('extra_data', '');
  form.set(`question-${firstQid}`, 'A');

  const finishUrl = `https://study4.com/tests/${testMeta.id}/finish/`;
  const finishRes = await fetch(finishUrl, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'User-Agent': DEFAULT_UA,
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://study4.com',
      Referer: startUrl,
      'X-CSRFToken': csrf,
    },
    body: form.toString(),
  });

  const location = finishRes.headers.get('location');
  if (finishRes.status !== 302 || !location || !location.includes('/results/')) {
    const body = await finishRes.text();
    throw new Error(`Finish POST ${finishUrl} unexpected HTTP ${finishRes.status} location=${location} body=${body.slice(0, 300)}`);
  }

  const resultsUrl = location.startsWith('http') ? location : `https://study4.com${location}`;
  const detailsUrl = resultsUrl.endsWith('/') ? `${resultsUrl}details/` : `${resultsUrl}/details/`;
  const detailsRes = await fetchText(detailsUrl, cookie);
  if (detailsRes.status !== 200) {
    throw new Error(`Details GET ${detailsUrl} returned HTTP ${detailsRes.status}`);
  }
  if (cachedFile) {
    fs.mkdirSync(path.dirname(cachedFile), { recursive: true });
    fs.writeFileSync(cachedFile, detailsRes.body, 'utf8');
  }
  return detailsRes.body;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Number.parseInt(args.limit || '10', 10);
  const collectionFilter = args.filter || 'toeic-lr-collection-1-test-';
  const cacheDir = args['cache-dir'] || '';
  const outPath = args.out || 'scripts/study4-toeic-collection-1.json';
  const cookie = loadCookie(args['cookie-file']);

  console.log(`Fetching TOEIC test list (filter="${collectionFilter}", limit=${limit})...`);
  const listRes = await fetchText('https://study4.com/tests/toeic/', cookie);
  if (listRes.status !== 200) {
    throw new Error(`Failed to fetch test list: HTTP ${listRes.status}`);
  }

  const listDoc = new JSDOM(listRes.body).window.document;
  const seen = new Set();
  const candidates = [];
  for (const a of listDoc.querySelectorAll('a[href*="/tests/"]')) {
    const href = a.getAttribute('href') || '';
    const m = href.match(/^\/tests\/(\d+)\/([^/]+)\/?$/);
    if (!m) continue;
    const [, id, slug] = m;
    if (!slug.includes(collectionFilter)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    candidates.push({
      id,
      slug,
      url: `https://study4.com/tests/${id}/${slug}/`,
    });
  }

  const targets = candidates.slice(0, limit);
  if (targets.length === 0) {
    throw new Error(`No matching tests found on page 1 for filter="${collectionFilter}"`);
  }
  console.log(`Found ${candidates.length} matching tests; crawling ${targets.length}.`);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tests = [];
  for (const target of targets) {
    console.log(`\n[${target.id}] ${target.slug}...`);
    const detailRes = await fetchText(target.url, cookie);
    if (detailRes.status !== 200) {
      throw new Error(`Test page ${target.url} HTTP ${detailRes.status}`);
    }
    const dDoc = new JSDOM(detailRes.body).window.document;
    const rawH1 = dDoc.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || target.slug;
    const title = rawH1.replace(/^Đề thi thử TOEIC\s*/i, '').trim() || rawH1;
    const partIds = [...dDoc.querySelectorAll('input[name="part"]')]
      .map((i) => i.getAttribute('value'))
      .filter(Boolean);

    if (partIds.length < 7) {
      throw new Error(`Expected 7 parts for ${target.id}, found ${partIds.length}`);
    }

    const practiceCache = cacheDir ? path.join(cacheDir, `practice_${target.id}.html`) : null;
    let audioByQid = new Map();
    if (practiceCache && fs.existsSync(practiceCache)) {
      const cachedBody = fs.readFileSync(practiceCache, 'utf8');
      audioByQid = buildAudioMap(cachedBody);
    }
    if (audioByQid.size === 0) {
      const listeningQuery = partIds
        .slice(0, 4)
        .map((p) => `part=${encodeURIComponent(p)}`)
        .join('&');
      const practiceUrl = `https://study4.com/tests/${target.id}/practice/?${listeningQuery}`;
      for (let attempt = 1; attempt <= 2; attempt++) {
        await sleep(attempt === 1 ? 1500 : 3500);
        const practiceRes = await fetchText(practiceUrl, cookie, {
          headers: { Referer: target.url },
        });
        if (practiceRes.status === 200) {
          audioByQid = buildAudioMap(practiceRes.body);
          if (audioByQid.size > 0) {
            if (practiceCache) {
              fs.mkdirSync(path.dirname(practiceCache), { recursive: true });
              fs.writeFileSync(practiceCache, practiceRes.body, 'utf8');
            }
            break;
          }
        }
      }
    }
    console.log(`  Parts: ${partIds.join(', ')} | Practice audio mappings: ${audioByQid.size}`);
    if (audioByQid.size === 0) {
      console.warn(`  Skipping test ${target.id} (no practice audio access / possibly gated).`);
      continue;
    }

    let detailsHtml;
    try {
      detailsHtml = await fetchOrReuseDetails(
        { ...target, title },
        partIds,
        cookie,
        cacheDir,
      );
    } catch (e) {
      if (String(e.message).startsWith('SKIP_GATED:')) {
        console.warn(`  Skipping test ${target.id} (${e.message}).`);
        continue;
      }
      throw e;
    }
    const parsed = parseDetailsHtml(detailsHtml, { ...target, title }, partIds, audioByQid);

    const missingAudio = parsed.questions.filter((q) => q.partNumber <= 4 && !q.audioUrl).length;
    const missingCorrect = parsed.questions.filter((q) => !q.correctLetter).length;
    console.log(
      `  Parsed ${parsed.totalQuestions} questions (missing listening audio: ${missingAudio}, missing correct answer: ${missingCorrect})`,
    );
    if (parsed.totalQuestions !== 200 || missingCorrect > 0) {
      console.warn(`  WARNING: incomplete data for test ${target.id}`);
    }
    tests.push(parsed);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        source: 'https://study4.com/tests/toeic/',
        crawledAt: new Date().toISOString(),
        collectionFilter,
        testCount: tests.length,
        tests,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`\nSaved ${tests.length} tests (${tests.reduce((s, t) => s + t.totalQuestions, 0)} questions) -> ${outPath}`);
}

main().catch((err) => {
  console.error('CRAWL ERROR:', err);
  process.exit(1);
});
