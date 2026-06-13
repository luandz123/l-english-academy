/**
 * TOEIC FULL TEST CRAWLER SCRIPT FOR NGOAINGU24H
 * 
 * HƯỚNG DẪN SỬ DỤNG:
 * 1. Đăng nhập vào trang https://ngoaingu24h.vn bằng tài khoản của bạn.
 * 2. Vào phần Luyện thi TOEIC -> Chọn một đề thi thử và làm bài (hoặc nộp bài ngay để có trang xem giải).
 * 3. Truy cập vào trang "Xem lại bài làm" hoặc "Giải thích chi tiết".
 * 4. Nhấn phím F12 để mở Console của trình duyệt.
 * 5. Copy toàn bộ nội dung script này, dán vào tab Console và nhấn Enter.
 * 6. Script sẽ tự động duyệt qua 200 câu hỏi, thu thập hình ảnh, audio, đáp án và giải thích chi tiết.
 * 7. Sau khi hoàn tất, script sẽ tự động tải xuống file `toeic_test_data.json`.
 * 8. Vào trang Admin của L-English Academy (/admin/fulltests) -> Tạo đề mới -> Click "Import JSON" và dán nội dung file vừa tải về vào để import trọn bộ 200 câu cực nhanh!
 */

(async function() {
  console.log("🚀 Bắt đầu TOEIC Full Test Crawler cho Ngoại Ngữ 24h...");

  // Cấu hình các selector trên trang Ngoại Ngữ 24h (Có thể điều chỉnh nếu web cập nhật cấu trúc DOM)
  const SELECTORS = {
    // Nút danh sách câu hỏi trong Palette điều hướng
    questionButtons: ".question-palette-item, .palette-item, .quiz-nav-button, button[id^='question-']",
    
    // Khung chứa nội dung câu hỏi hiện tại
    questionContainer: ".question-detail-container, .quiz-item, .game-object-container",
    
    // Phần nội dung chữ của câu hỏi
    questionText: ".question-text, .quiz-question-title, .question-title",
    
    // Hình ảnh đi kèm câu hỏi
    questionImage: "img.question-img, .question-image img, img[src*='upload']",
    
    // Audio nghe
    questionAudio: "audio source, audio",
    
    // Các đáp án lựa chọn
    answerItems: ".answer-item, .choice-item, .quiz-choice-item, .quiz-answer",
    answerText: ".answer-text, .choice-text, .quiz-choice-item-content",
    
    // Trạng thái đáp án đúng (thường có class correct, success hoặc check icon)
    correctAnswerClass: ".correct, .is-correct, .answer-correct, .success",
    
    // Khung giải thích chi tiết
    explanationContainer: ".explanation-content, .game-object-explanation-content, .explanation",
    transcriptText: ".transcript-content, .transcript",
    translationText: ".translation-content, .translation, .vietnamese-translate",
    
    // Khung đoạn văn đọc (Part 6/7)
    passageContainer: ".reading-match-game-scroller, .passage-content, .reading-passage, .passage-text"
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Lấy danh sách các nút câu hỏi trong palette
  let buttons = document.querySelectorAll(SELECTORS.questionButtons);
  if (buttons.length === 0) {
    // Thử tìm selector dự phòng
    buttons = document.querySelectorAll("button, a, div");
    buttons = Array.from(buttons).filter(el => {
      const txt = el.textContent?.trim();
      return /^\d+$/.test(txt) && parseInt(txt) <= 200;
    });
  }

  console.log(`📋 Đã tìm thấy ${buttons.length} câu hỏi cần thu thập.`);

  if (buttons.length === 0) {
    console.error("❌ Không tìm thấy palette danh sách câu hỏi. Vui lòng mở trang Giải thích chi tiết!");
    return;
  }

  const results = [];
  let currentGroup = null;

  // Đi qua từng câu hỏi
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const questionNumber = i + 1;
    
    console.log(`🔍 Đang click thu thập câu ${questionNumber}/${buttons.length}...`);
    
    // Click vào nút để hiển thị câu hỏi đó
    btn.scrollIntoView({ block: "center" });
    btn.click();
    await delay(500); // Đợi 500ms cho DOM cập nhật câu hỏi mới

    // Lấy DOM câu hỏi hiện tại
    const container = document.querySelector(SELECTORS.questionContainer) || document.body;
    
    // Extract Image
    let imageUrl = null;
    const imgEl = container.querySelector(SELECTORS.questionImage);
    if (imgEl) imageUrl = imgEl.src;

    // Extract Audio
    let audioUrl = null;
    const audioEl = container.querySelector(SELECTORS.questionAudio);
    if (audioEl) audioUrl = audioEl.src || audioEl.getAttribute("src");

    // Extract Question Text
    let questionText = "";
    const qTextEl = container.querySelector(SELECTORS.questionText);
    if (qTextEl) {
      questionText = qTextEl.textContent?.trim() || "";
    }

    // Extract Answers
    const answers = [];
    const answerEls = container.querySelectorAll(SELECTORS.answerItems);
    let correctIdx = -1;

    answerEls.forEach((ansEl, aIdx) => {
      const txtEl = ansEl.querySelector(SELECTORS.answerText) || ansEl;
      const ansText = txtEl.textContent?.replace(/^[A-D][\.\:\-\s]+/, "").trim() || "";
      
      const isCorrect = ansEl.querySelector(SELECTORS.correctAnswerClass) !== null || 
                        ansEl.classList.contains("correct") || 
                        ansEl.classList.contains("success") ||
                        ansEl.getAttribute("data-correct") === "true";
      
      if (isCorrect) correctIdx = aIdx;

      answers.push({
        answer_text: ansText,
        is_correct: isCorrect,
        display_order: aIdx
      });
    });

    // Extract Explanation, Transcript, Translation
    let explanation = "";
    const expEl = container.querySelector(SELECTORS.explanationContainer);
    if (expEl) explanation = expEl.textContent?.trim() || "";

    let transcript = "";
    const transEl = container.querySelector(SELECTORS.transcriptText);
    if (transEl) transcript = transEl.textContent?.trim() || "";

    let translation = "";
    const translationEl = container.querySelector(SELECTORS.translationText);
    if (translationEl) translation = translationEl.textContent?.trim() || "";

    // Gán giải thích cụ thể cho đáp án đúng
    if (correctIdx !== -1 && answers[correctIdx]) {
      answers[correctIdx].explanation = explanation;
    }

    // Extract Passage Text (Part 6, 7)
    let passageText = null;
    const passageEl = document.querySelector(SELECTORS.passageContainer);
    if (passageEl) passageText = passageEl.textContent?.trim() || "";

    // Xác định Part dựa trên số thứ tự câu hỏi tiêu chuẩn TOEIC
    let part = 5;
    if (questionNumber <= 6) part = 1;
    else if (questionNumber <= 31) part = 2;
    else if (questionNumber <= 70) part = 3;
    else if (questionNumber <= 100) part = 4;
    else if (questionNumber <= 130) part = 5;
    else if (questionNumber <= 146) part = 6;
    else part = 7;

    // Logic gán Group ID để nhóm câu hỏi (cho Part 3, 4, 6, 7)
    let groupId = null;
    if (part === 3 || part === 4) {
      // Nhóm 3 câu chung audio
      groupId = `group_audio_${Math.floor((questionNumber - 32) / 3)}`;
    } else if (part === 6) {
      // Nhóm 4 câu chung passage
      groupId = `group_passage_p6_${Math.floor((questionNumber - 131) / 4)}`;
    } else if (part === 7) {
      // Nhóm câu hỏi dựa trên sự thay đổi của nội dung passage văn bản đọc
      if (passageText) {
        if (!currentGroup || currentGroup.passage !== passageText) {
          currentGroup = {
            id: `group_passage_p7_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            passage: passageText
          };
        }
        groupId = currentGroup.id;
      }
    }

    results.push({
      part: part,
      question_text: questionText,
      display_order: questionNumber,
      audio_url: audioUrl,
      image_url: imageUrl,
      answers: answers,
      transcript: transcript,
      translation: translation,
      passage_text: passageText,
      group_id: groupId
    });
  }

  // Tạo đề JSON hoàn chỉnh
  const testTitle = document.querySelector("h1, .test-title, .title")?.textContent?.trim() || "TOEIC Full Test Crawled";
  const finalPayload = {
    title: testTitle,
    audio_url: results.find(r => r.part === 1 || r.part === 2 || r.part === 3 || r.part === 4)?.audio_url || null,
    questions: results
  };

  console.log("✅ Hoàn tất thu thập dữ liệu! Chuẩn bị tải xuống file JSON...");

  // Tải file JSON xuống máy khách
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `${testTitle.replace(/[^a-zA-Z0-9]/g, "_")}_data.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  console.log("🎉 File JSON đã được tải về thành công! Hãy import vào hệ thống Admin của bạn.");
})();
