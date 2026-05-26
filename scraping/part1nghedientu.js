// ==========================================================
// 🚀 NGOAINGU24H EXTRACTOR v13.1 — FIX AUDIO + BỎ X RÁC
// Mỗi .game-object-view.game-object-para.has-sound = 1 dòng CSV
// ==========================================================
(function () {
  function csvCell(val) {
    if (val === null || val === undefined || val === '') return '';
    return '"' + String(val).replace(/"/g, '""') + '"';
  }

  function cleanText(s) {
    return String(s || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getAudioFromBlock(el) {
    let audioUrl = '';

    el.querySelectorAll(
      'audio, source, iframe, embed, [src], [data-src], [data-url]'
    ).forEach(a => {
      const src =
        a.src ||
        a.currentSrc ||
        a.getAttribute('src') ||
        a.getAttribute('data-src') ||
        a.getAttribute('data-url');

      if (src && /\.mp3|audio|sound/i.test(src) && !audioUrl) {
        audioUrl = src;
      }
    });

    if (!audioUrl) {
      const near = el.closest('.game-object-view-container, [id^="review-"]');

      near?.querySelectorAll(
        'audio, source, iframe, embed, [src], [data-src], [data-url]'
      ).forEach(a => {
        const src =
          a.src ||
          a.currentSrc ||
          a.getAttribute('src') ||
          a.getAttribute('data-src') ||
          a.getAttribute('data-url');

        if (src && /\.mp3|audio|sound/i.test(src) && !audioUrl) {
          audioUrl = src;
        }
      });
    }

    return audioUrl;
  }

  function isBadKeyword(txt) {
    const blacklist = [
      'x',
      'ok',
      'true',
      'false',
      'undefined',
      'null',
      'hiển thị dọc',
      'giải thích',
      'transcript'
    ];

    const t = cleanText(txt).toLowerCase();

    if (!t) return true;
    if (blacklist.includes(t)) return true;
    if (t.length <= 1) return true;
    if (t.length > 40) return true;
    if (/^\d+$/.test(t)) return true;
    if (/^[^a-zA-ZÀ-ỹ]+$/.test(t)) return true;
    if (/[()]/.test(t)) return true;
    if (/^câu\s*\d+/i.test(t)) return true;

    return false;
  }

  function addWord(words, txt) {
    txt = cleanText(txt).replace(/\.+$/g, '');

    if (isBadKeyword(txt)) return;

    const lowerList = words.map(w => w.toLowerCase());
    if (!lowerList.includes(txt.toLowerCase())) {
      words.push(txt);
    }
  }

  function getKeywordsFromBlock(el) {
    const words = [];

    el.querySelectorAll(
      '.quiz-choice-item-content, textarea, input, [class*="correct"], [class*="answer"]'
    ).forEach(x => {
      let txt = '';

      if (x.tagName === 'TEXTAREA' || x.tagName === 'INPUT') {
        txt = x.value || '';
      } else {
        txt = x.innerText || '';
      }

      addWord(words, txt);
    });

    el.querySelectorAll('.game-object-child-wrap').forEach(child => {
      const t = cleanText(child.innerText);

      const m = t.match(/\s([a-zA-Z][a-zA-Z'-]*(?:\s+[a-zA-Z][a-zA-Z'-]*)?)$/);

      if (m) {
        addWord(words, m[1]);
      }
    });

    return words;
  }

  function parseLines(text) {
    const finalLines = [];

    ['A', 'B', 'C', 'D'].forEach(ch => {
      let english = '';
      let vietnamese = '';

      const engRe = new RegExp(
        `\\(${ch}\\)\\s*([\\s\\S]*?)(?=\\([A-D]\\)|\\n[A-D]\\.\\s*|$)`,
        'i'
      );

      const engMatch = text.match(engRe);

      if (engMatch?.[1]) {
        english = cleanText(
          engMatch[1]
            .replace(/A\.|B\.|C\.|D\./g, '')
            .replace(/Giải thích:|Transcript:/gi, '')
        );
      }

      const viRe = new RegExp(
        `(?:^|\\n)${ch}\\.\\s*([^\\n]+)`,
        'i'
      );

      const viMatch = text.match(viRe);

      if (viMatch?.[1]) {
        vietnamese = cleanText(viMatch[1]);
      }

      if (english) {
        finalLines.push({
          char: ch,
          english,
          vietnamese
        });
      }
    });

    return finalLines;
  }

  function parseGroups() {
    const groups = [];

    const blocks = document.querySelectorAll(
      '.game-object-view.game-object-para.has-sound'
    );

    blocks.forEach((el, index) => {
      const expEl = el.querySelector('.game-object-question-explanation-para');
      const rawText = expEl ? expEl.innerText : el.innerText;

      const text = String(rawText || '')
        .replace(/\u00A0/g, ' ')
        .trim();

      const audioUrl = getAudioFromBlock(el);
      const finalLines = parseLines(text);
      const vocabList = getKeywordsFromBlock(el);

      if (finalLines.length > 0) {
        groups.push({
          index: index + 1,
          audioUrl,
          finalLines,
          vocabList
        });

        console.log(`✅ Group ${index + 1}`, {
          audioUrl,
          answers: finalLines.map(x => x.english),
          vocabList
        });
      }
    });

    return groups;
  }

  function generateCSV(groups) {
    const header = 'question_text,answers,translation,audio_url,vocabulary,dictation_keywords';
    const rows = [];

    groups.forEach(g => {
      const question_text = '';

      const answers = g.finalLines
        .map(line => line.english)
        .join(' | ');

      const translation = g.finalLines
        .map((line, idx) => {
          return line.vietnamese
            ? `${idx + 1}. ${line.vietnamese}`
            : `${idx + 1}.`;
        })
        .join(' ');

      const vocabulary = g.vocabList
        .map(w => `${w}|||`)
        .join(';');

      const dictation_keywords = g.vocabList.join(',');

      rows.push([
        question_text,
        csvCell(answers),
        csvCell(translation),
        csvCell(g.audioUrl),
        csvCell(vocabulary),
        csvCell(dictation_keywords)
      ].join(','));
    });

    return [header, ...rows].join('\n');
  }

  function downloadCSV(content, filename) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  function buildUI() {
    const groups = parseGroups();
    const csv = generateCSV(groups);

    const totalRows = groups.length;
    const mappedAudio = groups.filter(g => g.audioUrl).length;
    const first = groups[0];

    const previewText = first
      ? `
        <b>[Hàng đầu tiên]</b><br>
        • Audio:
        <span style="color:#22c55e;word-break:break-all;">
          ${first.audioUrl || 'Không thấy audio'}
        </span><br>
        • Answers:
        <span style="color:#93c5fd;">
          ${first.finalLines.map(x => x.english).join(' | ')}
        </span><br>
        • Keywords:
        <span style="color:#facc15;">
          ${first.vocabList.join(', ')}
        </span>
      `
      : '(Chưa có dữ liệu)';

    const old = document.getElementById('nn24h-v131-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'nn24h-v131-panel';

    panel.style.cssText = `
      position:fixed;
      bottom:20px;
      right:20px;
      z-index:999999;
      background:#0f172a;
      color:white;
      padding:22px;
      border-radius:24px;
      box-shadow:0 25px 60px rgba(0,0,0,.6);
      font-family:Arial,sans-serif;
      width:460px;
      border:1px solid rgba(255,255,255,.12);
    `;

    panel.innerHTML = `
      <div style="font-size:17px;font-weight:900;margin-bottom:12px;
        background:linear-gradient(45deg,#06b6d4,#22c55e);
        -webkit-background-clip:text;
        -webkit-text-fill-color:transparent;">
        🚀 Extractor v13.1 — Audio đúng + bỏ x rác
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;font-size:12px;text-align:center;">
        <div style="background:rgba(255,255,255,.06);padding:10px;border-radius:12px;">
          <div style="font-size:18px;font-weight:800;color:#06b6d4">${totalRows}</div>
          <div style="opacity:.65">Số dòng CSV</div>
        </div>

        <div style="background:rgba(255,255,255,.06);padding:10px;border-radius:12px;">
          <div style="font-size:18px;font-weight:800;color:#22c55e">${mappedAudio}/${totalRows}</div>
          <div style="opacity:.65">Audio đã khớp</div>
        </div>
      </div>

      <div style="font-size:11px;background:rgba(34,197,94,.07);
        border:1px solid rgba(34,197,94,.2);
        padding:12px;border-radius:12px;margin-bottom:12px;
        color:#cbd5e1;line-height:1.6;
        max-height:160px;overflow:auto;">
        ${previewText}
      </div>

      <button id="nn131-download" style="width:100%;padding:13px;border:none;border-radius:14px;
        background:linear-gradient(135deg,#22c55e,#16a34a);
        color:white;font-weight:900;font-size:14px;cursor:pointer;margin-bottom:8px;">
        ⬇️ Tải CSV
      </button>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button id="nn131-copy" style="padding:10px;border:1px solid #22c55e;
          border-radius:10px;background:transparent;color:#22c55e;
          font-size:12px;font-weight:800;cursor:pointer;">
          📋 Copy CSV
        </button>

        <button id="nn131-refresh" style="padding:10px;border:1px solid #06b6d4;
          border-radius:10px;background:transparent;color:#06b6d4;
          font-size:12px;font-weight:800;cursor:pointer;">
          🔄 Quét lại
        </button>
      </div>

      <button id="nn131-close" style="position:absolute;top:16px;right:16px;
        background:none;border:none;color:white;opacity:.45;
        cursor:pointer;font-size:18px;">✕</button>
    `;

    document.body.appendChild(panel);

    document.getElementById('nn131-download').onclick = function () {
      const name = document.title
        .replace(/[^a-z0-9]/gi, '_')
        .substring(0, 35);

      downloadCSV(csv, `nn24h_audio_fixed_${name}.csv`);
    };

    document.getElementById('nn131-copy').onclick = function () {
      navigator.clipboard.writeText(csv).then(() => {
        this.textContent = '✅ Đã copy!';
        setTimeout(() => {
          this.textContent = '📋 Copy CSV';
        }, 1800);
      });
    };

    document.getElementById('nn131-refresh').onclick = buildUI;
    document.getElementById('nn131-close').onclick = () => panel.remove();
  }

  setTimeout(buildUI, 800);
})();