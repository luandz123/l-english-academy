// ==========================================================
// 🚀 NGOAINGU24H EXTRACTOR v9.5 (INTERCEPT + CLEAN PARSE)
// Chạy script này TRƯỚC KHI load trang hoặc ngay khi vào trang
// ==========================================================
(function () {

  // ── 1. INTERCEPT FETCH + XHR ĐỂ BẮT AUDIO URL ĐỘNG ──
  const capturedAudio = new Set();
  const audioRegex = /\.(mp3|m4a|ogg|wav|aac|opus)(\?.*)?$/i;

  // Intercept fetch
  const _fetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && audioRegex.test(url)) capturedAudio.add(url);
    return _fetch.apply(this, args);
  };

  // Intercept XHR
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (url && audioRegex.test(url)) capturedAudio.add(url);
    return _open.call(this, method, url, ...rest);
  };

  // ── 2. SNIFF AUDIO (tất cả nguồn) ──
  function sniffAudio() {
    const links = new Set([...capturedAudio]);

    // performance entries
    performance.getEntriesByType("resource").forEach(e => {
      if (audioRegex.test(e.name)) links.add(e.name);
    });

    // DOM attributes
    document.querySelectorAll("*").forEach(el => {
      ["src","href","data-src","data-url","data-audio","data-mp3","data-file"].forEach(attr => {
        let v = el.getAttribute ? el.getAttribute(attr) : null;
        if (v && audioRegex.test(v)) {
          if (!v.startsWith("http")) try { v = new URL(v, location.origin).href; } catch(e){}
          links.add(v);
        }
      });
    });

    // Script tags
    document.querySelectorAll("script").forEach(s => {
      const m = s.innerText.match(/["']([^"']*\.(?:mp3|m4a|ogg|wav|aac|opus)[^"']*)["']/gi);
      if (m) m.forEach(x => {
        let u = x.replace(/["']/g,'');
        if (!u.startsWith("http")) try { u = new URL(u, location.origin).href; } catch(e){}
        links.add(u);
      });
    });

    // Audio/source elements
    document.querySelectorAll("audio, source").forEach(el => {
      const s = el.src || el.currentSrc;
      if (s && audioRegex.test(s)) links.add(s);
    });

    return [...links].filter(l => l.startsWith("http"));
  }

  // ── 3. PARSE KEYWORD BLOCKS ──
  // Cấu trúc thật: "N.\n[câu có ___]\n[đáp án]"
  // → đáp án = dòng ngay sau dòng chứa ___
  function extractKeywords(rawAnswers) {
    const lines = rawAnswers.split('\n').map(l => l.trim()).filter(Boolean);
    const keywords = [];
    let slotIndex = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Nếu dòng hiện tại là số thứ tự (1. / 10. / 105.)
      if (/^\d{1,3}\s*\.?\s*$/.test(line)) {
        // Dòng tiếp theo là câu có ___
        const sentenceLine = lines[i + 1] || '';
        // Dòng sau câu là đáp án
        const answerLine = lines[i + 2] || '';

        if (sentenceLine.match(/_{2,}/) && answerLine && !answerLine.match(/_{2,}/) && !answerLine.match(/^\d{1,3}\s*\.?\s*$/)) {
          // Bỏ qua nếu answerLine là câu dài (>80 ký tự) - không phải đáp án
          if (answerLine.length <= 80 && /[a-zA-ZÀ-ỹ]/.test(answerLine)) {
            keywords.push(`${slotIndex}. ${answerLine}`);
            slotIndex++;
            i += 2; // skip câu + đáp án
            continue;
          }
        }
      }
    }

    return keywords.join(', ');
  }

  // ── 4. TÁCH NỘI DUNG MỖI Mp3 BLOCK ──
  function parseBlock(raw) {
    // Tìm điểm split: "Giải thích:" hoặc "Dịch nghĩa:"
    const splitKw = raw.includes('Giải thích:') ? 'Giải thích:'
                  : raw.includes('Dịch nghĩa:') ? 'Dịch nghĩa:'
                  : null;

    if (!splitKw) {
      return { dialogue: raw.trim(), translation: '', answers: '' };
    }

    const si = raw.indexOf(splitKw);
    const dialogue = raw.substring(0, si).trim();
    const afterSplit = raw.substring(si + splitKw.length);

    // Tìm điểm bắt đầu block đáp án
    // Pattern: dòng CHỈ có số (1. hoặc 10. hoặc 105.) — không có chữ nào khác
    const ansBlockMatch = afterSplit.match(/\n\s*\d{1,3}\s*\.?\s*\n/);

    let translation = '';
    let answers = '';

    if (ansBlockMatch) {
      const ai = afterSplit.indexOf(ansBlockMatch[0]);
      translation = afterSplit.substring(0, ai).trim();
      const rawAnswers = afterSplit.substring(ai).trim();
      answers = extractKeywords(rawAnswers);
    } else {
      translation = afterSplit.trim();
    }

    translation = translation
      .replace(/^Giải thích:\s*/i, '')
      .replace(/^Dịch nghĩa:\s*/i, '')
      .trim();

    return { dialogue, translation, answers };
  }

  // ── 5. PARSE TẤT CẢ Mp3 BLOCKS ──
  function parseQuestions() {
    const body = document.body.innerText;
    const questions = [];
    const mp3Matches = [...body.matchAll(/Mp3\.(\d+)/gi)];

    mp3Matches.forEach((m, idx) => {
      const num = parseInt(m[1]);
      const start = m.index;
      const end = idx + 1 < mp3Matches.length ? mp3Matches[idx+1].index : body.length;
      const raw = body.slice(start, end).trim();
      const parts = parseBlock(raw);

      questions.push({
        number: num,
        dialogue: parts.dialogue,
        translation: parts.translation,
        answers: parts.answers,
        audio_url: '',
        raw: raw.substring(0, 600) // debug preview
      });
    });

    return questions;
  }

  // ── 6. MAP AUDIO → QUESTION ──
  function mapAudio(questions, audioLinks) {
    // Ưu tiên 1: match số trong tên file với số Mp3
    questions.forEach(q => {
      const match = audioLinks.find(url => {
        const fn = url.split('/').pop().toLowerCase();
        // "mp31.mp3", "mp3-1.mp3", "mp3_1.mp3", "1633408665354-mp31.mp3"
        const patterns = [
          fn.match(/mp3[-_]?(\d+)\.mp3$/i),
          fn.match(/[-_]mp3(\d+)\.mp3$/i),
          fn.match(/mp3(\d+)/i),
        ];
        return patterns.some(p => p && parseInt(p[1]) === q.number);
      });
      if (match) q.audio_url = match;
    });

    // Ưu tiên 2: nếu số audio == số câu → map theo index
    const unmapped = questions.filter(q => !q.audio_url);
    const unusedAudio = audioLinks.filter(u => !questions.some(q => q.audio_url === u));
    if (unmapped.length === unusedAudio.length && unmapped.length > 0) {
      unmapped.forEach((q, i) => { q.audio_url = unusedAudio[i]; });
    }
  }

  // ── 7. PROMPT ──
  const PROMPT = `Tôi sẽ gửi dữ liệu thô TOEIC Listening / Dictation gồm transcript, từ cần điền, nghĩa tiếng Việt và audio.

Hãy chuyển toàn bộ thành CSV theo đúng format dưới đây để import hệ thống học tiếng Anh.

Header:
question_text,answers,translation,audio_url,vocabulary,dictation_keywords

QUY TẮC:
1. Mỗi audio = 1 dòng CSV.
2. question_text: Để trống.
3. answers: Các câu HOÀN CHỈNH đã fill đáp án vào chỗ trống, nối bằng |
4. translation: Gộp toàn bộ dịch nghĩa tiếng Việt, KHÔNG dùng dấu |
5. audio_url: Giữ nguyên link mp3.
6. vocabulary: word|nghĩa|phiên âm|ví dụ — nhiều từ ngăn bằng ;
7. dictation_keywords: các keyword đã fill, ngăn bằng dấu phẩy.

KHÔNG: giải thích, markdown, code block, rút gọn, bỏ sót.
PHẢI: đúng chuẩn CSV, giữ nguyên dấu câu tiếng Anh.`;

  // ── 8. BUILD UI (sau 1.5s để audio load xong) ──
  function buildUI() {
    const audioLinks = sniffAudio();
    const questions = parseQuestions();
    mapAudio(questions, audioLinks);

    const old = document.getElementById("nn24h-panel");
    if (old) old.remove();

    const panel = document.createElement("div");
    panel.id = "nn24h-panel";
    panel.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:99999;
      background:#0f172a;color:white;padding:24px;border-radius:28px;
      box-shadow:0 25px 60px rgba(0,0,0,.6);font-family:sans-serif;
      width:400px;border:1px solid rgba(255,255,255,.1);
    `;

    const audioMapped = questions.filter(q => q.audio_url).length;

    panel.innerHTML = `
      <div style="font-size:18px;font-weight:900;margin-bottom:10px;
        background:linear-gradient(45deg,#22c55e,#06b6d4);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
        🚀 Extractor v9.5
      </div>
      <div style="font-size:12px;margin-bottom:14px;opacity:.7;line-height:1.8;">
        📊 Câu: <b>${questions.length}</b> &nbsp;|&nbsp;
        🎵 Audio tìm được: <b>${audioLinks.length}</b> &nbsp;|&nbsp;
        ✅ Mapped: <b style="color:${audioMapped===questions.length?'#4ade80':'#f87171'}">${audioMapped}/${questions.length}</b>
      </div>

      <button id="nn-copy" style="width:100%;padding:14px;border:none;border-radius:14px;
        background:#22c55e;color:white;font-weight:800;font-size:14px;cursor:pointer;
        box-shadow:0 4px 15px rgba(34,197,94,.4);margin-bottom:8px;">
        📋 Copy Prompt → Claude
      </button>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <button id="nn-resniff" style="padding:10px;border:1px solid #22c55e;
          border-radius:10px;background:transparent;color:#22c55e;font-size:12px;font-weight:700;cursor:pointer;">
          🔄 Re-sniff Audio
        </button>
        <button id="nn-debug" style="padding:10px;border:1px solid #334155;
          border-radius:10px;background:transparent;color:#94a3b8;font-size:12px;cursor:pointer;">
          🐛 Debug JSON
        </button>
      </div>

      <div style="font-size:11px;max-height:130px;overflow-y:auto;
        background:rgba(0,0,0,.25);padding:10px;border-radius:10px;color:#94a3b8;">
        ${questions.map(q => `
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#06b6d4">Mp3.${q.number}</span>
            <span style="color:${q.audio_url?'#4ade80':'#f87171'}">
              ${q.audio_url ? '🎵 ✔' : '🎵 ✕'}
            </span>
            <span style="color:${q.answers?'#4ade80':'#f87171'}">
              ${q.answers ? '🔑 ✔' : '🔑 ✕'}
            </span>
            <span style="color:${q.translation?'#4ade80':'#f87171'}">
              ${q.translation ? '🇻🇳 ✔' : '🇻🇳 ✕'}
            </span>
          </div>
        `).join('')}
      </div>

      <button id="nn-close" style="position:absolute;top:18px;right:18px;
        background:none;border:none;color:white;opacity:.4;cursor:pointer;font-size:18px;">✕</button>
    `;
    document.body.appendChild(panel);

    // Copy prompt
    document.getElementById("nn-copy").onclick = function () {
      const blocks = questions.map(q => [
        `=== Mp3.${q.number} ===`,
        `[TRANSCRIPT]\n${q.dialogue || '(trống)'}`,
        q.translation ? `[DỊCH NGHĨA]\n${q.translation}` : '',
        q.answers     ? `[KEYWORDS]\n${q.answers}` : '',
        `[AUDIO] ${q.audio_url || 'CHƯA TÌM THẤY'}`
      ].filter(Boolean).join('\n\n')).join('\n\n' + '-'.repeat(50) + '\n\n');

      const full = `${PROMPT}\n\n${'='.repeat(60)}\n\nDỮ LIỆU THÔ:\n\n${blocks}`;
      navigator.clipboard.writeText(full).then(() => {
        this.textContent = "✅ Đã copy!";
        setTimeout(() => this.textContent = "📋 Copy Prompt → Claude", 2000);
      });
    };

    // Re-sniff (bấm sau khi play audio)
    document.getElementById("nn-resniff").onclick = function() {
      this.textContent = "⏳ Đang sniff...";
      const fresh = sniffAudio();
      mapAudio(questions, fresh);
      setTimeout(() => {
        buildUI();
      }, 500);
    };

    // Debug
    document.getElementById("nn-debug").onclick = function () {
      const dbg = {
        totalAudio: audioLinks.length,
        audioUrls: audioLinks,
        totalQuestions: questions.length,
        questions: questions.map(q => ({
          mp3: q.number,
          audio: q.audio_url || 'MISSING',
          hasDialogue: !!q.dialogue,
          hasTranslation: !!q.translation,
          keywords: q.answers,
          rawPreview: q.raw
        }))
      };
      navigator.clipboard.writeText(JSON.stringify(dbg, null, 2)).then(() => {
        this.textContent = "✅ Copied!";
        setTimeout(() => this.textContent = "🐛 Debug JSON", 2000);
      });
    };

    document.getElementById("nn-close").onclick = () => panel.remove();
  }

  // Chờ 1.5s cho audio load động rồi mới build
  setTimeout(buildUI, 1500);

})();