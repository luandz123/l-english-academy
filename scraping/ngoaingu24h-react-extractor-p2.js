// ==========================================================
// 🚀 NGOAINGU24H REACT EXTRACTOR (TOEIC GAME/PRACTICE)
// ==========================================================
// Bản này sử dụng React Fiber để lấy dữ liệu ngầm từ component.
// Phù hợp cho các bài có giao diện "Game-like" (Nghe-Đọc).
// ==========================================================

(function () {
  function getReactProps(el) {
    const key = Object.keys(el).find(k => k.startsWith('__reactFiber'));
    if (!key) return null;
    let fiber = el[key];
    while (fiber) {
      if (fiber.memoizedProps && Object.keys(fiber.memoizedProps).length > 1)
        return fiber.memoizedProps;
      fiber = fiber.return;
    }
    return null;
  }

  function findAudioUrl(obj, depth = 0) {
    if (depth > 10 || !obj || typeof obj !== 'object') return null;
    for (const key of Object.keys(obj)) {
      try {
        const val = obj[key];
        if (typeof val === 'string' && val.match(/\.(mp3|ogg|wav|m4a|aac)/i)) return val;
        if (typeof val === 'string' && val.startsWith('http') && val.match(/audio|sound/i)) return val;
        if (typeof val === 'object') {
           const found = findAudioUrl(val, depth + 1);
           if (found) return found;
        }
      } catch(e){}
    }
    return null;
  }

  function isVisible(el) {
    let cur = el;
    while (cur && cur !== document.body) {
      const style = window.getComputedStyle(cur);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')
        return false;
      if (cur.getAttribute('aria-hidden') === 'true') return false;
      cur = cur.parentElement;
    }
    return true;
  }

  const allQuestionEls = [...document.querySelectorAll('.game-object-question-extend-v2, .question-item, .cau-hoi-item')];
  const allExplainEls  = [...document.querySelectorAll('.game-object-explanation-content, .explain-content')];

  const questionEls = allQuestionEls.filter(isVisible);
  const explainEls  = allExplainEls.filter(isVisible);

  const results = [];
  const seenNums = new Set();

  questionEls.forEach((qEl, idx) => {
    const indexEl = qEl.querySelector('.game-object-view-aio-question-index, .q-index');
    const questionNum = indexEl ? indexEl.innerText.trim().replace(':', '') : String(idx + 1);

    if (seenNums.has(questionNum)) return;
    seenNums.add(questionNum);

    const soundDiv = qEl.querySelector('.game-object-question-extend-v2-sound, .audio-player');
    let audioUrl = null;
    if (soundDiv) audioUrl = findAudioUrl(getReactProps(soundDiv));
    if (!audioUrl) audioUrl = findAudioUrl(getReactProps(qEl));

    const explEl = explainEls[results.length];
    const fullText = explEl ? explEl.innerText.trim() : '';

    const transcriptMatch = fullText.match(/Transcript[:\s]*([\s\S]*?)(?=Dịch[:\s]|→|$)/i);
    const dichMatch       = fullText.match(/Dịch[:\s]*([\s\S]*?)(?=→|Đáp án|$)/i);
    const answerMatch     = fullText.match(/→\s*Đáp án là\s*([A-D])/i) || fullText.match(/Đáp án đúng[:\s]*([A-D])/i);

    results.push({
      question    : questionNum,
      audioUrl    : audioUrl || '',
      transcript  : transcriptMatch ? transcriptMatch[1].trim() : '',
      translation : dichMatch       ? dichMatch[1].trim()       : '',
      answer      : answerMatch     ? answerMatch[1]            : '',
      rawExplain  : fullText
    });
  });

  function buildChatGPTPrompt() {
    const dataStr = JSON.stringify(results, null, 2);
    return `Dưới đây là dữ liệu JSON của ${results.length} câu hỏi TOEIC. 
Hãy chuyển dữ liệu này thành bảng TSV (Tab-separated values) để tôi import vào hệ thống.

YÊU CẦU ĐỊNH DẠNG (Chọn loại phù hợp):

LOẠI 1: Nếu đây là Part 2 (chỉ có 3 đáp án A, B, C):
Header: question_text [TAB] audio_url [TAB] a [TAB] b [TAB] c [TAB] correct [TAB] translation [TAB] vocabulary
- question_text: Câu hỏi tiếng Anh (lấy từ transcript).
- audio_url: Giữ nguyên link audio.
- a, b, c: Các lựa chọn tiếng Anh (nếu trong transcript có ghi, nếu không có hãy tự dịch ngược từ phần Dịch nghĩa/Giải thích).
- correct: Chỉ điền chữ cái A hoặc B hoặc C.
- translation: Dịch nghĩa tiếng Việt của câu hỏi.
- vocabulary: Liệt kê từ vựng quan trọng (từ|nghĩa|phiên_âm|ví dụ), cách nhau bằng dấu chấm phẩy (;).

LOẠI 2: Nếu đây là các Part khác (4 đáp án):
Header: question_text [TAB] answer_1 [TAB] answer_2 [TAB] answer_3 [TAB] answer_4 [TAB] translation [TAB] audio_url [TAB] image_url [TAB] vocabulary
- question_text: Câu hỏi tiếng Anh.
- translation: Dịch nghĩa tiếng Việt (Bao gồm cả dịch đáp án nếu cần).
- audio_url: Link audio.
- image_url: Để trống.
- vocabulary: format: từ|nghĩa|phiên_âm|ví dụ

DỮ LIỆU JSON:
${dataStr}`;
  }

  const old = document.getElementById("nn24h-react-panel");
  if (old) old.remove();

  const panel = document.createElement("div");
  panel.id = "nn24h-react-panel";
  panel.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:99999;background:linear-gradient(135deg,#064e3b,#065f46);color:white;padding:25px;border-radius:24px;box-shadow:0 25px 50px rgba(0,0,0,0.4);font-family:sans-serif;width:340px;border:1px solid rgba(255,255,255,0.1);";
  panel.innerHTML = `
    <div style="font-size:20px;font-weight:900;margin-bottom:15px;color:#34d399;">💎 React Extractor</div>
    <div style="background:rgba(0,0,0,0.2);padding:12px;border-radius:16px;margin-bottom:15px;font-size:13px;">
       ✅ Đã tìm thấy <b>${results.length}</b> câu hỏi.<br>
       🎵 Audio bắt được: <b>${results.filter(r => r.audioUrl).length}</b>
    </div>
    <button id="nn24h-copy-prompt" style="width:100%;padding:16px;border:none;border-radius:16px;background:#10b981;color:white;font-weight:800;cursor:pointer;font-size:15px;">📋 Copy Prompt ChatGPT</button>
    <div id="nn24h-status" style="margin-top:10px;font-size:12px;text-align:center;color:#34d399;height:16px;"></div>
    <button id="nn24h-close" style="position:absolute;top:15px;right:15px;background:none;border:none;color:white;opacity:0.5;cursor:pointer;">✕</button>
  `;
  document.body.appendChild(panel);

  document.getElementById("nn24h-copy-prompt").onclick = function() {
    navigator.clipboard.writeText(buildChatGPTPrompt()).then(() => {
      document.getElementById("nn24h-status").textContent = "✅ Đã copy Prompt!";
      setTimeout(() => document.getElementById("nn24h-status").textContent = "", 3000);
    });
  };
  document.getElementById("nn24h-close").onclick = () => panel.remove();
})();
