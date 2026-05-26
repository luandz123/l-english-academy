// ==========================================================
// 🎧 NGOAINGU24H EXTRACTOR v12.0 — Dictation (Câu X-Y)
// ==========================================================
(function () {

  // ── 1. PARSE TẤT CẢ REVIEW BLOCKS ──
  function parseBlocks() {
    const blocks = [];

    document.querySelectorAll('#main-game-review-section [id^="review-"]').forEach(blockEl => {

      // Header: "Câu 1-7:"
      const headerEl = blockEl.querySelector('.question-index-title');
      const header   = headerEl ? headerEl.innerText.trim() : '';

      // Audio URL: lấy thẳng từ <audio> bên trong block này
      const audioEl  = blockEl.querySelector('audio');
      const audioUrl = audioEl
        ? (audioEl.src || audioEl.currentSrc || audioEl.getAttribute('src') || '')
        : '';

      // Translation: từ explanation div
      const expEl = blockEl.querySelector('.game-object-question-explanation-para');
      let translation = '';
      if (expEl) {
        translation = expEl.innerText
          .replace(/giải thích\s*:/gi, '')
          .replace(/dịch nghĩa\s*:/gi, '')
          .trim();
      }

      // Children: mỗi .game-object-child-wrap = 1 câu con
      const children = [];
      blockEl.querySelectorAll('.game-object-child-wrap').forEach(childEl => {

        // Câu hỏi: chứa "(N)______"
        const sentEl   = childEl.querySelector('.game-object-question-text');
        const sentence = sentEl ? sentEl.innerText.trim() : '';
        if (!sentence) return;

        // Slot number từ "(N)"
        const slotMatch = sentence.match(/\((\d+)\)/);
        const slotNum   = slotMatch ? parseInt(slotMatch[1]) : null;

        // Đáp án đúng
        const ansEl = childEl.querySelector('.quiz-choice-item-content.correct');
        const answer = ansEl ? ansEl.innerText.trim() : '';

        children.push({ slotNum, sentence, answer });
      });

      if (children.length) {
        blocks.push({ header, audioUrl, translation, children });
      }
    });

    return blocks;
  }

  // ── 2. RECONSTRUCT DIALOGUE ──
  // Từ các câu con có (N)______ → ghép lại thành câu hoàn chỉnh
  function reconstructDialogue(children) {

    // Bước 1: build slotMap {1:'been', 2:'Japan', ...}
    const slotMap = {};
    children.forEach(c => {
      if (c.slotNum !== null && c.answer) slotMap[c.slotNum] = c.answer;
    });

    // Bước 2: normalize sentence → base (bỏ "(N)" prefix của slot được đánh số)
    const normalize = s => s.replace(/\(\d+\)\s*/g, '').replace(/\s{2,}/g, ' ').trim();

    // Bước 3: với mỗi child, xác định slot N nằm ở vị trí blank thứ mấy trong base sentence
    const baseOrder  = [];   // thứ tự xuất hiện của base sentences
    const baseSlots  = {};   // base → [slotNum tại position 0, 1, 2...]

    children.forEach(c => {
      const base = normalize(c.sentence);

      if (!baseSlots[base]) {
        baseSlots[base] = [];
        baseOrder.push(base);
      }

      if (c.slotNum === null) return;

      // Đếm số blank (______) xuất hiện TRƯỚC slot (N)______ trong sentence gốc
      const splitParts    = c.sentence.split(/\(\d+\)______/);
      const beforeSlot    = splitParts[0] || '';
      const blanksBefore  = (beforeSlot.match(/______/g) || []).length;

      baseSlots[base][blanksBefore] = c.slotNum;
    });

    // Bước 4: fill từng base sentence bằng slotMap
    const lines = baseOrder.map(base => {
      const slots = baseSlots[base] || [];
      let blankIdx = 0;
      return base.replace(/______/g, () => {
        const slotNum = slots[blankIdx++];
        return slotNum !== undefined
          ? (slotMap[slotNum] || '______')
          : '______';
      });
    });

    return { lines, slotMap };
  }

  // ── 3. CSV HELPERS ──
  function csvCell(val) {
    if (val === null || val === undefined || val === '') return '';
    return '"' + String(val).replace(/"/g, '""') + '"';
  }

  // ── 4. GENERATE CSV — đúng format v10.0 ──
  function generateCSV(blocks) {
    const header = 'question_text,answers,translation,audio_url,vocabulary,dictation_keywords';
    const rows   = [];

    blocks.forEach(b => {
      const { lines, slotMap } = reconstructDialogue(b.children);
      if (!lines.length) return;

      // answers: các câu đã fill, ngăn cách " | "
      const answers = lines.join(' | ');

      // keywords theo thứ tự slot
      const keywords = Object.keys(slotMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(k => slotMap[k]);

      // vocabulary: "word|||;word|||"
      const vocabulary = keywords.map(k => `${k}|||`).join(';');

      // dictation_keywords: "word1,word2,..."
      const dictation_keywords = keywords.join(',');

      rows.push([
        '',                          // question_text: trống
        csvCell(answers),            // câu đã fill blank
        csvCell(b.translation),      // tiếng Việt
        b.audioUrl || '',            // audio URL
        csvCell(vocabulary),         // word|||;word|||
        csvCell(dictation_keywords), // word1,word2,...
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

  // ── 6. PANEL UI ──
  function buildUI() {
    const blocks = parseBlocks();
    const csv    = generateCSV(blocks);

    const totalBlocks = blocks.length;
    const mappedAudio = blocks.filter(b => b.audioUrl).length;
    const totalKw     = blocks.reduce((s, b) => {
      const { slotMap } = reconstructDialogue(b.children);
      return s + Object.keys(slotMap).length;
    }, 0);
    const hasTrans = blocks.filter(b => b.translation).length;

    // Preview block đầu tiên
    const b0 = blocks[0];
    let previewText = '(chưa có dữ liệu)';
    if (b0) {
      const { lines } = reconstructDialogue(b0.children);
      previewText = `<b>${b0.header}</b><br>` +
        lines.slice(0, 3).map(l => `→ ${l}`).join('<br>') +
        (lines.length > 3 ? '<br>...' : '');
    }

    const old = document.getElementById('nn24h-v12-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id    = 'nn24h-v12-panel';
    panel.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:99999;
      background:#0f172a;color:white;padding:24px;border-radius:28px;
      box-shadow:0 25px 60px rgba(0,0,0,.6);font-family:sans-serif;
      width:450px;border:1px solid rgba(255,255,255,.1);
    `;

    panel.innerHTML = `
      <div style="font-size:17px;font-weight:900;margin-bottom:12px;
        background:linear-gradient(45deg,#f59e0b,#ef4444);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
        🎧 Extractor v12.0 — Dictation
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px;font-size:11px;text-align:center;">
        <div style="background:rgba(255,255,255,.06);padding:8px;border-radius:10px;">
          <div style="font-size:16px;font-weight:700;color:#06b6d4">${totalBlocks}</div>
          <div style="opacity:.6">Nhóm</div>
        </div>
        <div style="background:rgba(255,255,255,.06);padding:8px;border-radius:10px;">
          <div style="font-size:16px;font-weight:700;color:${mappedAudio===totalBlocks?'#4ade80':'#f87171'}">${mappedAudio}/${totalBlocks}</div>
          <div style="opacity:.6">Audio</div>
        </div>
        <div style="background:rgba(255,255,255,.06);padding:8px;border-radius:10px;">
          <div style="font-size:16px;font-weight:700;color:#a78bfa">${totalKw}</div>
          <div style="opacity:.6">Keywords</div>
        </div>
        <div style="background:rgba(255,255,255,.06);padding:8px;border-radius:10px;">
          <div style="font-size:16px;font-weight:700;color:${hasTrans===totalBlocks?'#4ade80':'#f87171'}">${hasTrans}/${totalBlocks}</div>
          <div style="opacity:.6">Dịch</div>
        </div>
      </div>

      <!-- Preview -->
      <div style="font-size:10px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);
        padding:10px;border-radius:10px;margin-bottom:12px;color:#fcd34d;line-height:1.7;
        max-height:90px;overflow:hidden;">${previewText}</div>

      <button id="nn12-download" style="width:100%;padding:13px;border:none;border-radius:14px;
        background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-weight:800;
        font-size:14px;cursor:pointer;margin-bottom:8px;">
        ⬇️ Download CSV (${totalBlocks} dòng)
      </button>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <button id="nn12-copy" style="padding:10px;border:1px solid #f59e0b;
          border-radius:10px;background:transparent;color:#f59e0b;font-size:12px;font-weight:700;cursor:pointer;">
          📋 Copy CSV
        </button>
        <button id="nn12-refresh" style="padding:10px;border:1px solid #06b6d4;
          border-radius:10px;background:transparent;color:#06b6d4;font-size:12px;font-weight:700;cursor:pointer;">
          🔄 Re-scan
        </button>
      </div>

      <!-- Per-block list -->
      <div style="font-size:11px;max-height:130px;overflow-y:auto;
        background:rgba(0,0,0,.25);padding:10px;border-radius:10px;color:#94a3b8;">
        ${blocks.map(b => {
          const { slotMap } = reconstructDialogue(b.children);
          const kw = Object.keys(slotMap).length;
          return `
          <div style="display:flex;justify-content:space-between;align-items:center;
            margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.05);">
            <span style="color:#06b6d4;font-weight:700;min-width:90px">${b.header}</span>
            <span style="color:${b.audioUrl?'#4ade80':'#f87171'}">🎵${b.audioUrl?'✔':'✕'}</span>
            <span style="color:${kw?'#4ade80':'#f87171'}">🔑${kw}từ</span>
            <span style="color:${b.translation?'#4ade80':'#f87171'}">🇻🇳${b.translation?'✔':'✕'}</span>
          </div>`;
        }).join('')}
      </div>

      <button id="nn12-close" style="position:absolute;top:18px;right:18px;
        background:none;border:none;color:white;opacity:.4;cursor:pointer;font-size:18px;">✕</button>
    `;

    document.body.appendChild(panel);

    document.getElementById('nn12-download').onclick = function () {
      const name = document.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
      downloadCSV(csv, `dictation_${name}_${Date.now()}.csv`);
      this.textContent = '✅ Đang tải...';
      setTimeout(() => this.textContent = `⬇️ Download CSV (${totalBlocks} dòng)`, 2000);
    };
    document.getElementById('nn12-copy').onclick = function () {
      navigator.clipboard.writeText(csv).then(() => {
        this.textContent = '✅ Copied!';
        setTimeout(() => this.textContent = '📋 Copy CSV', 2000);
      });
    };
    document.getElementById('nn12-refresh').onclick = () => buildUI();
    document.getElementById('nn12-close').onclick   = () => panel.remove();
  }

  setTimeout(buildUI, 800);
})();