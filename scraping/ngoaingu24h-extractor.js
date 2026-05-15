// ==========================================================
// 🚀 NGOAINGU24H EXTRACTOR v5
// ==========================================================
// Chạy trong Console (F12) trên trang "Xem giải chi tiết"
// LƯU Ý: Mở DevTools TRƯỚC khi vào trang
//
// Sau khi chạy: hiện nút copy nổi trên trang
// Click nút → copy toàn bộ dữ liệu → paste vào ChatGPT
// ==========================================================

(function () {
  // ── 1. EXTRACT AUDIO ──
  const audioLinks = [];
  document.querySelectorAll("audio").forEach((audio) => {
    let src = audio.src || audio.currentSrc;
    if (!src) { const s = audio.querySelector("source"); if (s) src = s.src; }
    if (!src) src = audio.dataset.src || audio.getAttribute("data-url") || "";
    if (src && !audioLinks.includes(src)) audioLinks.push(src);
  });
  document.querySelectorAll("*").forEach((el) => {
    ["src", "data-src", "data-audio", "data-url", "href"].forEach((attr) => {
      const val = el.getAttribute(attr);
      if (val && /\.(mp3|m4a|ogg|wav|aac|opus)(\?.*)?$/i.test(val) && !audioLinks.includes(val))
        audioLinks.push(val);
    });
  });

  // ── 2. PARSE QUESTIONS ──
  const bodyText = document.body.innerText;
  const questions = [];
  const matches = [...bodyText.matchAll(/Câu\s+(\d+)\s*:/g)];

  for (let m = 0; m < matches.length; m++) {
    const qNum = parseInt(matches[m][1]);
    const startIdx = matches[m].index + matches[m][0].length;
    const endIdx = m + 1 < matches.length ? matches[m + 1].index : bodyText.length;
    const block = bodyText.slice(startIdx, endIdx).trim();

    const translationMatch = block.match(/Dịch nghĩa:\s*(.+?)(?:\n|$)/);
    const translation = translationMatch ? translationMatch[1].trim() : "";

    const answersVi = [];
    for (const line of block.split("\n")) {
      const am = line.trim().match(/^\(([A-D])\)\s*(.+)/);
      if (am) answersVi.push({ letter: am[1], text: am[2].trim() });
    }

    let questionTextRaw = "";
    for (const pattern of [
      new RegExp(`(?:^|\\n)${qNum}\\.\\s*\\n(.+?)(?:\\n|$)`),
      new RegExp(`(?:^|\\n)${qNum}\\.\\s+(.+?)(?:\\n|$)`),
    ]) {
      const match = block.match(pattern);
      if (match && match[1].trim().length > 5) { questionTextRaw = match[1].trim(); break; }
    }

    let fillWord = "";
    if (questionTextRaw) {
      const qIdx = block.indexOf(questionTextRaw);
      if (qIdx >= 0) {
        const afterLines = block.slice(qIdx + questionTextRaw.length).split("\n").map(l => l.trim()).filter(l => l.length > 0);
        for (const c of afterLines) {
          if (c.length < 25 && /^[a-zA-Z][a-zA-Z\s'\-]*$/.test(c) &&
            !c.startsWith("(") && !c.startsWith("Câu") && !c.startsWith("Giải") && !c.startsWith("Dịch")) {
            fillWord = c; break;
          }
        }
      }
    }

    questions.push({
      number: qNum,
      en_raw: questionTextRaw,
      fill_word: fillWord,
      answers_vi: answersVi,
      translation: translation,
      audio_url: audioLinks[qNum - 1] || "",
    });
  }

  // ── 3. BUILD COPY CONTENT ──
  // Format dễ đọc cho ChatGPT - chứa đủ thông tin để dịch ngược
  function buildCopyText() {
    let lines = [];
    lines.push("Dưới đây là " + questions.length + " câu hỏi TOEIC luyện nghe điền từ.");
    lines.push("Mỗi câu có: câu tiếng Anh (còn chỗ trống), từ cần điền, dịch nghĩa, đáp án tiếng Việt, audio.");
    lines.push("Hãy tạo bảng TSV (dùng TAB thật ngăn cách) với header:");
    lines.push("question_text\\tanswer_1\\tanswer_2\\tanswer_3\\tanswer_4\\ttranslation\\taudio_url\\timage_url\\tvocabulary");
    lines.push("");
    lines.push("Quy tắc cho từng cột:");
    lines.push("- question_text: viết lại câu tiếng Anh ĐẦY ĐỦ (điền hết chỗ trống, dùng fill word + suy ra từ dịch nghĩa)");
    lines.push("- answer_1/2/3: dịch ngược 3 đáp án (A)(B)(C) sang tiếng Anh");
    lines.push("- answer_4: để trống");
    lines.push("- translation: [dịch nghĩa câu hỏi]\\nA. [đáp án A tiếng Việt]\\nB. [đáp án B]\\nC. [đáp án C]");
    lines.push("- audio_url: giữ nguyên link audio");
    lines.push("- image_url: để trống");
    lines.push("- vocabulary: dùng format [fill_word]|[dịch nghĩa tiếng Việt của fill_word]");
    lines.push("  Ví dụ: replace|thay thế hoặc battery|pin");
    lines.push("");
    lines.push("QUAN TRỌNG:");
    lines.push("- Không dùng dấu ngoặc kép");
    lines.push("- Dùng TAB thật (không phải khoảng trắng) ngăn cách cột");
    lines.push("- Cột vocabulary: fill_word chính là từ cần điền trong câu hỏi, dịch nghĩa ngắn gọn");
    lines.push("");
    lines.push("=== DỮ LIỆU ===");
    lines.push("");

    questions.forEach((q) => {
      lines.push("Câu " + q.number + ":");
      lines.push("  EN: " + q.en_raw);
      lines.push("  Fill: " + q.fill_word);
      lines.push("  Dịch: " + q.translation);
      q.answers_vi.forEach((a) => lines.push("  (" + a.letter + ") " + a.text));
      lines.push("  Audio: " + q.audio_url);
      lines.push("");
    });

    return lines.join("\n");
  }

  // ── 4. CREATE FLOATING UI ──
  // Remove old panel if re-running
  const old = document.getElementById("nn24h-extractor-panel");
  if (old) old.remove();

  const panel = document.createElement("div");
  panel.id = "nn24h-extractor-panel";
  panel.innerHTML = `
    <div style="
      position:fixed; bottom:20px; right:20px; z-index:99999;
      background:linear-gradient(135deg,#6366f1,#8b5cf6);
      color:white; padding:16px 20px; border-radius:16px;
      box-shadow:0 8px 32px rgba(0,0,0,0.3);
      font-family:system-ui,-apple-system,sans-serif;
      min-width:280px; max-width:350px;
    ">
      <div style="font-size:15px;font-weight:700;margin-bottom:8px;">
        🚀 Extractor v5
      </div>
      <div style="font-size:12px;opacity:0.9;margin-bottom:12px;">
        📝 ${questions.length} câu | 🎵 ${audioLinks.length} audio
      </div>
      <button id="nn24h-copy-btn" style="
        width:100%; padding:10px 16px; border:none; border-radius:10px;
        background:white; color:#6366f1; font-weight:700; font-size:14px;
        cursor:pointer; transition:all 0.2s;
      " onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'"
         onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">
        📋 Copy dữ liệu cho ChatGPT
      </button>
      <div id="nn24h-status" style="font-size:11px;margin-top:8px;text-align:center;min-height:16px;"></div>
      <button id="nn24h-close-btn" style="
        position:absolute; top:8px; right:12px;
        background:none; border:none; color:white; opacity:0.7;
        cursor:pointer; font-size:16px;
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">✕</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Copy button handler
  document.getElementById("nn24h-copy-btn").onclick = function () {
    const text = buildCopyText();
    const status = document.getElementById("nn24h-status");
    navigator.clipboard.writeText(text).then(() => {
      status.textContent = "✅ Đã copy! Paste vào ChatGPT →";
      status.style.color = "#86efac";
      this.textContent = "✅ Đã copy!";
      setTimeout(() => { this.textContent = "📋 Copy dữ liệu cho ChatGPT"; }, 2000);
    }).catch(() => {
      // Fallback: textarea
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      status.textContent = "✅ Đã copy (fallback)!";
      status.style.color = "#86efac";
    });
  };

  // Close button
  document.getElementById("nn24h-close-btn").onclick = () => panel.remove();

  // Console summary
  console.log("🚀 Extractor v5: " + questions.length + " câu, " + audioLinks.length + " audio");
  console.log("👆 Dùng nút copy ở góc phải dưới màn hình");
})();
