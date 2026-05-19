
(function() {
  const result = {
    title: document.title,
    audioUrl: document.querySelector('audio')?.src || document.querySelector('source')?.src || '',
    sections: []
  };

  // Find all elements that might be question headers like "Câu 1-7:"
  const allElements = Array.from(document.querySelectorAll('p, div, span, h3'));
  const questionGroups = allElements.filter(el => /Câu \d+-\d+:/.test(el.innerText));

  // If no groups found, try to find question blocks directly
  const questionBlocks = document.querySelectorAll('.question-block, [class*="QuestionGroup"]');
  
  // This is a complex DOM. The best way is to get the whole text and parse it.
  // But let's try to get structured data.
  
  // In "Xem giải chi tiết", each question has a number 1., 2., 3.
  const questions = [];
  const questionRows = allElements.filter(el => /^\d+\.\s*$/.test(el.innerText.trim()));
  
  questionRows.forEach(row => {
    const qNum = row.innerText.trim();
    const parent = row.parentElement;
    // The question text is usually in the next sibling or same parent
    // The correct word is shown below the blank
    questions.push({
      num: qNum,
      content: parent?.innerText || ''
    });
  });

  return {
    title: document.title,
    audioUrl: result.audioUrl,
    fullText: document.body.innerText,
    html: document.body.innerHTML
  };
})();
