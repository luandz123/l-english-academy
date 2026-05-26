// ==========================================================
// 🚀 NGOAINGU24H EXTRACTOR v11.2 — Part 1 Spelling
// ==========================================================
(function () {

  // ── 1. AUDIO MAP ──
  function buildAudioMap() {
    const map = {};
    const re = /-mp3(\d+)\.mp3/i;
    const addUrl = url => {
      if (!url) return;
      const m = url.match(re);
      if (m) map[parseInt(m[1])] = url;
    };
    performance.getEntriesByType('resource').forEach(e => addUrl(e.name));
    document.querySelectorAll('audio, source').forEach(el =>
      addUrl(el.src || el.currentSrc || el.getAttribute('src'))
    );
    return map;
  }

  // ── 2. PARSE GROUPS ──
  function parseGroups(audioMap) {
    const groups = [];
    let current = null;

    document.querySelectorAll('div.game-object-view').forEach(el => {
      if (el.classList.contains('game-object-para')) {
        const headerEl = el.querySelector('.game-object-question-text b, .game-object-question-text B');
        const headerText = (headerEl ? headerEl.innerText : el.innerText).trim();
        const m = headerText.match(/mp3\.(\d+)/i);
        const mp3Num = m ? parseInt(m[1]) : null;
        current = { mp3Num, audioUrl: mp3Num ? (audioMap[mp3Num] || '') : '', questions: [] };
        groups.push(current);
        return;
      }

      if (el.classList.contains('game-object-spelling')) {
        if (!current) {
          current = { mp3Num: null, audioUrl: '', questions: [] };
          groups.push(current);
        }

        const qEl     = el.querySelector('div.game-object-question-text');
        const rawSentence = qEl ? qEl.innerText.trim() : '';

        const ansEl   = el.querySelector('div.quiz-choice-item-content.correct');
        const answer  = ansEl ? ansEl.innerText.trim() : '';

        // Fill blank — thêm space trước/sau để tránh "reviewinga"
        const filledSentence = rawSentence.replace(/_{2,}/g, match => ` ${answer || '___'} `).replace(/\s{2,}/g, ' ').trim();

        const transEl     = el.querySelector('div.game-object-explanation-content');
        const translation = transEl ? transEl.innerText.trim() : '';

        current.questions.push({ filledSentence, answer, translation });
      }
    });

    return groups;
  }

  // ── 3. CSV ESCAPE ──
  function csvCell(val) {
    if (val === null || val === undefined || val === '') return '';
    return '"' + String(val).replace(/"/g, '""') + '"';
  }

  // ── 4. GENERATE CSV — khớp format v10.0 ──
  function generateCSV(groups) {
    const header = 'question_text,answers,translation,audio_url,vocabulary,dictation_keywords';
    const rows = [];

    groups.forEach(g => {
      if (!g.questions.length) return;

      // question_text: để trống
      const question_text = '';

      // answers: các câu đã fill blank, ngăn cách bằng " | "
      const answers = g.questions
        .map(q => q.filledSentence)
        .join(' | ');

      // translation: "1. xxx 2. xxx ..." — không dùng |
      const translation = g.questions
        .map((q, i) => `${i + 1}. ${q.translation}`)
        .join(' ');

      // vocabulary: "word|||;word|||;..." — giống v10.0
      const vocabulary = g.questions
        .filter(q => q.answer)
        .map(q => `${q.answer}|||`)
        .join(';');

      // dictation_keywords: "word1,word2,..." — giống v10.0
      const dictation_keywords = g.questions
        .filter(q => q.answer)
        .map(q => q.answer)
        .join(',');

      rows.push([
        question_text,
        csvCell(answers),
        csvCell(translation),
        g.audioUrl || '',
        csvCell(vocabulary),
        csvCell(dictation_keywords),
      ].join(','));
    });

    return [header, ...rows].join('\n');
  }

  // ── 5. DOWNLOAD ──
  function downloadCSV(content, filename) {
    const BOM  = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ── 6. PANEL ──
  function buildUI() {
    const audioMap = buildAudioMap();
    const groups   = parseGroups(audioMap);
    const csv      = generateCSV(groups);

    const totalTranh  = groups.length;
    const totalQ      = groups.reduce((s, g) => s + g.questions.length, 0);
    const mappedAudio = groups.filter(g => g.audioUrl).length;
    const hasAns      = groups.reduce((s, g) => s + g.questions.filter(q => q.answer).length, 0);
    const hasTrans    = groups.reduce((s, g) => s + g.questions.filter(q => q.translation).length, 0);

    const g0 = groups[0];
    const previewText = g0
      ? `<b>mp3.${g0.mp3Num}</b>:<br>` +
        g0.questions.map(q => `→ <i>${q.filledSentence}</i> <b>[${q.answer}]</b>`).join('<br>')
      : '(chưa có dữ liệu)';

    const old = document.getElementById('nn24h-v112-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'nn24h-v112-panel';
    panel.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:99999;
      background:#0f172a;color:white;padding:24px;border-radius:28px;
      box-shadow:0 25px 60px rgba(0,0,0,.6);font-family:sans-serif;
      width:440px;border:1px solid rgba(255,255,255,.1);
    `;

    panel.innerHTML = `
      <div style="font-size:17px;font-weight:900;margin-bottom:12px;
        background:linear-gradient(45deg,#22c55e,#06b6d4);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
        🚀 Extractor v11.2 — Part 1
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px;font-size:11px;text-align:center;">
        <div style="background:rgba(255,255,255,.06);padding:8px;border-radius:10px;">
          <div style="font-size:16px;font-weight:700;color:#06b6d4">${totalTranh}</div>
          <div style="opacity:.6">Tranh</div>
        </div>
        <div style="background:rgba(255,255,255,.06);padding:8px;border-radius:10px;">
          <div style="font-size:16px;font-weight:700;color:#a78bfa">${totalQ}</div>
          <div style="opacity:.6">Câu</div>
        </div>
        <div style="background:rgba(255,255,255,.06);padding:8px;border-radius:10px;">
          <div style="font-size:16px;font-weight:700;color:${mappedAudio===totalTranh?'#4ade80':'#f87171'}">${mappedAudio}/${totalTranh}</div>
          <div style="opacity:.6">Audio</div>
        </div>
        <div style="background:rgba(255,255,255,.06);padding:8px;border-radius:10px;">
          <div style="font-size:16px;font-weight:700;color:${hasAns===totalQ?'#4ade80':'#f87171'}">${hasAns}/${totalQ}</div>
          <div style="opacity:.6">Keywords</div>
        </div>
      </div>

      <div style="font-size:10px;background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.2);
        padding:10px;border-radius:10px;margin-bottom:12px;color:#86efac;line-height:1.7;
        max-height:80px;overflow:hidden;">${previewText}</div>

      <button id="nn112-download" style="width:100%;padding:13px;border:none;border-radius:14px;
        background:linear-gradient(135deg,#22c55e,#16a34a);color:white;font-weight:800;
        font-size:14px;cursor:pointer;margin-bottom:8px;">
        ⬇️ Download CSV (${totalTranh} dòng)
      </button>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <button id="nn112-copy" style="padding:10px;border:1px solid #22c55e;
          border-radius:10px;background:transparent;color:#22c55e;font-size:12px;font-weight:700;cursor:pointer;">
          📋 Copy CSV
        </button>
        <button id="nn112-refresh" style="padding:10px;border:1px solid #06b6d4;
          border-radius:10px;background:transparent;color:#06b6d4;font-size:12px;font-weight:700;cursor:pointer;">
          🔄 Re-scan
        </button>
      </div>

      <div style="font-size:11px;max-height:130px;overflow-y:auto;
        background:rgba(0,0,0,.25);padding:10px;border-radius:10px;color:#94a3b8;">
        ${groups.map(g => `
          <div style="display:flex;justify-content:space-between;align-items:center;
            margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.05);">
            <span style="color:#06b6d4;font-weight:700;min-width:60px">mp3.${g.mp3Num ?? '?'}</span>
            <span style="color:#a78bfa">${g.questions.length}câu</span>
            <span style="color:${g.audioUrl?'#4ade80':'#f87171'}">🎵${g.audioUrl?'✔':'✕'}</span>
            <span style="color:${g.questions.every(q=>q.answer)?'#4ade80':'#f87171'}">
              🔑${g.questions.filter(q=>q.answer).length}/${g.questions.length}
            </span>
            <span style="color:${g.questions.every(q=>q.translation)?'#4ade80':'#f87171'}">
              🇻🇳${g.questions.filter(q=>q.translation).length}/${g.questions.length}
            </span>
          </div>
        `).join('')}
      </div>

      <button id="nn112-close" style="position:absolute;top:18px;right:18px;
        background:none;border:none;color:white;opacity:.4;cursor:pointer;font-size:18px;">✕</button>
    `;

    document.body.appendChild(panel);

    document.getElementById('nn112-download').onclick = function () {
      const name = document.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
      downloadCSV(csv, `part1_${name}_${Date.now()}.csv`);
      this.textContent = '✅ Đang tải...';
      setTimeout(() => this.textContent = `⬇️ Download CSV (${totalTranh} dòng)`, 2000);
    };
    document.getElementById('nn112-copy').onclick = function () {
      navigator.clipboard.writeText(csv).then(() => {
        this.textContent = '✅ Copied!';
        setTimeout(() => this.textContent = '📋 Copy CSV', 2000);
      });
    };
    document.getElementById('nn112-refresh').onclick = () => buildUI();
    document.getElementById('nn112-close').onclick   = () => panel.remove();
  }

  setTimeout(buildUI, 800);
})();