(() => {
  const container = document.querySelector(".game-object-para-children");
  if (!container) { console.error("❌ Không tìm thấy container"); return; }
  const wraps = container.querySelectorAll(".game-object-quiz-wrap");
  console.log(`✅ ${wraps.length} câu`);

  const parseChoices = (text) => {
    const out = { A:"", B:"", C:"", D:"" };
    ["A","B","C","D"].forEach((l, i, arr) => {
      const next = arr[i+1];
      const re = next
        ? new RegExp(`\\(${l}\\)\\s*(.+?)(?=\\(${next}\\)|=>|$)`, "s")
        : new RegExp(`\\(${l}\\)\\s*(.+?)(?=>|$)`, "s");
      const m = text.match(re);
      if (m) out[l] = m[1].replace(/\s+/g," ").trim().replace(/=\s*$/,"");
    });
    return out;
  };
  const cleanTail = s => s.replace(/\s*(Tạm\s+)?[Dd]ịch\s*:.*$/s,"").replace(/=\s*$/,"").trim();

  const results = [];
  wraps.forEach((wrap) => {
    const img = wrap.querySelector(".game-object-question-extend-v2-image img, img.image-preview, img");
    const imageURL = img ? img.src : "";

    let correctLetter = "";
    const correctEl = wrap.querySelector(".quiz-choice-item-content.correct");
    if (correctEl) {
      const m = correctEl.innerText.trim().match(/\(([ABCD])\)/);
      if (m) correctLetter = m[1];
    }

    const expEl = wrap.querySelector(".game-object-explanation-content");
    const raw = expEl ? expEl.innerText.trim() : "";

    if (!correctLetter) {
      const m = raw.match(/=>\s*Đáp án\s*([ABCD])/i);
      if (m) correctLetter = m[1];
    }

    const [enPart="", viPart=""] = raw.split(/(?:Tạm\s+)?[Dd]ịch\s*:/);
    const en = parseChoices(enPart);
    const vi = parseChoices(viPart);

    // Explanation = chỉ dịch đáp án đúng
    const explanation = correctLetter ? (vi[correctLetter] || "") : "";

    // Translation = tất cả 4, format "(A) ... (B) ... (C) ... (D) ..."
    const translation = ["A","B","C","D"]
      .map(l => vi[l] ? `(${l}) ${vi[l]}` : "")
      .filter(Boolean).join(" ");

    results.push({
      QuestionText: "Look at the photo and choose the best description.",
      A: cleanTail(en.A), B: cleanTail(en.B),
      C: cleanTail(en.C), D: cleanTail(en.D),
      Correct: correctLetter,
      Explanation: explanation,
      Translation: translation,
      AudioURL: "",
      ImageURL: imageURL,
    });
  });

  console.table(results.map(r => ({
    Correct: r.Correct,
    Explanation: r.Explanation.slice(0,40),
    hasImg: !!r.ImageURL,
    A: r.A.slice(0,30),
  })));

  // ── CSV ───────────────────────────────────────────────────────
  const esc = v => `"${String(v).replace(/"/g,'""')}"`;
  const header = ["QuestionText","A","B","C","D","Correct","Explanation","Translation","AudioURL","ImageURL"];
  const csv = [
    header.join(","),
    ...results.map(q =>
      [q.QuestionText,q.A,q.B,q.C,q.D,q.Correct,q.Explanation,q.Translation,q.AudioURL,q.ImageURL]
      .map(esc).join(",")
    )
  ].join("\n");

  // ── Overlay ───────────────────────────────────────────────────
  document.getElementById("__csv_overlay")?.remove();
  const ov = document.createElement("div");
  ov.id = "__csv_overlay";
  ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:monospace`;
  ov.innerHTML = `
    <div style="background:#1e1e2e;color:#cdd6f4;border-radius:12px;width:85vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.6);overflow:hidden">
      <div style="padding:14px 20px;background:#313244;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #45475a">
        <span style="font-size:15px;font-weight:700;color:#cba6f7">📋 CSV — ${results.length} câu</span>
        <div style="display:flex;gap:8px">
          <button id="__csv_copy" style="padding:6px 16px;border-radius:6px;border:none;cursor:pointer;background:#a6e3a1;color:#1e1e2e;font-weight:700;font-size:13px">⬇ Copy CSV</button>
          <button id="__csv_close" style="padding:6px 14px;border-radius:6px;border:none;cursor:pointer;background:#f38ba8;color:#1e1e2e;font-weight:700;font-size:13px">✕ Đóng</button>
        </div>
      </div>
      <div style="padding:8px 20px;background:#181825;font-size:12px;color:#6c7086;border-bottom:1px solid #313244">
        ✅ ${results.filter(q=>q.Correct).length} đáp án &nbsp;|&nbsp;
        🖼 ${results.filter(q=>q.ImageURL).length} ảnh &nbsp;|&nbsp;
        📝 ${results.filter(q=>q.Explanation).length} explanation
      </div>
      <textarea id="__csv_text" readonly style="flex:1;margin:0;padding:16px 20px;background:#181825;color:#a6e3a1;border:none;outline:none;resize:none;font-size:11px;line-height:1.6;overflow:auto"></textarea>
      <div id="__csv_status" style="padding:8px 20px;background:#313244;font-size:12px;color:#6c7086;text-align:center">Nhấn Copy CSV → paste vào Google Sheets</div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById("__csv_text").value = csv;
  document.getElementById("__csv_copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(csv);
      document.getElementById("__csv_copy").textContent = "✅ Đã copy!";
      document.getElementById("__csv_status").textContent = `✅ Đã copy ${results.length} câu!`;
      document.getElementById("__csv_status").style.color = "#a6e3a1";
      setTimeout(() => document.getElementById("__csv_copy").textContent = "⬇ Copy CSV", 2500);
    } catch { document.getElementById("__csv_text").select(); document.execCommand("copy"); }
  };
  document.getElementById("__csv_close").onclick = () => ov.remove();
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
})();