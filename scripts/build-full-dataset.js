import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

function extractStem(qText) {
  const lower = qText.toLowerCase().trim();
  if (lower.startsWith('where is') || lower.startsWith("where's") || lower.startsWith('where are')) {
    return { text: 'Where is / Where are', type: 'wh-question', label: 'Câu hỏi Nơi chốn (Where)', tip: 'Tìm giới từ chỉ nơi chốn (at, in, on, next to...) hoặc vị trí. Không bao giờ chọn Yes/No!' };
  }
  if (lower.startsWith('where')) {
    return { text: 'Where', type: 'wh-question', label: 'Câu hỏi Nơi chốn (Where)', tip: 'Tìm vị trí, phòng ban, địa chỉ, công viên. Không bao giờ chọn Yes/No!' };
  }
  if (lower.startsWith('when does') || lower.startsWith('when will') || lower.startsWith('when is') || lower.startsWith("when's") || lower.startsWith('when')) {
    return { text: 'When', type: 'wh-question', label: 'Câu hỏi Thời gian (When)', tip: 'Tìm mốc thời gian (giờ, ngày, tháng, liên từ until/after/before). Tuyệt đối tránh Yes/No!' };
  }
  if (lower.startsWith('who should') || lower.startsWith('who sent') || lower.startsWith('who is') || lower.startsWith("who's") || lower.startsWith('who')) {
    return { text: 'Who', type: 'wh-question', label: 'Câu hỏi Người (Who)', tip: 'Tìm tên người, chức danh (manager, assistant, director), phòng ban hoặc câu gián tiếp.' };
  }
  if (lower.startsWith('why was') || lower.startsWith('why did') || lower.startsWith('why is') || lower.startsWith("why don't") || lower.startsWith('why')) {
    return { text: 'Why', type: 'wh-question', label: 'Câu hỏi Lý do (Why)', tip: 'Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!' };
  }
  if (lower.startsWith('what time')) {
    return { text: 'What time', type: 'wh-question', label: 'Câu hỏi Giờ giấc cụ thể', tip: 'Tìm mốc giờ cụ thể (at 6 o’clock, after 2 PM) hoặc giờ mở/đóng cửa.' };
  }
  if (lower.startsWith('which')) {
    return { text: 'Which', type: 'wh-question', label: 'Câu hỏi Lựa chọn (Which)', tip: 'Tìm phương án được chỉ định (The red one, That option, Either is fine).' };
  }
  if (lower.startsWith('what')) {
    return { text: 'What', type: 'wh-question', label: 'Câu hỏi Thông tin (What)', tip: 'Bắt danh từ trọng tâm hoặc thông tin được yêu cầu.' };
  }
  if (lower.startsWith('how long')) {
    return { text: 'How long', type: 'wh-question', label: 'Câu hỏi Khoảng thời gian', tip: 'Tìm khoảng thời gian (for 2 weeks, three days), khác với When (mốc thời gian).' };
  }
  if (lower.startsWith('how much') || lower.startsWith('how many')) {
    return { text: 'How much / How many', type: 'wh-question', label: 'Câu hỏi Số lượng / Giá cả', tip: 'Tìm con số hoặc giá tiền ($50, ten copies).' };
  }
  if (lower.startsWith('how often')) {
    return { text: 'How often', type: 'wh-question', label: 'Câu hỏi Tần suất', tip: 'Tìm trạng từ chỉ tần suất (twice a year, once a week, daily).' };
  }
  if (lower.startsWith('how')) {
    return { text: 'How', type: 'wh-question', label: 'Câu hỏi Phương thức (How)', tip: 'Tìm phương tiện (by bus, online) hoặc cách thức thực hiện.' };
  }
  if (lower.startsWith('would you like') || lower.startsWith('do you want') || lower.includes(' or ')) {
    return { text: 'Would you like ... (Or)', type: 'choice-or', label: 'Câu hỏi Mời / Lựa chọn (Or)', tip: 'Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks.' };
  }
  if (lower.startsWith('will you') || lower.startsWith('can you') || lower.startsWith('could you') || lower.startsWith('would you')) {
    return { text: 'Can / Could / Will you', type: 'request-offer', label: 'Câu hỏi Yêu cầu / Đề nghị', tip: 'Đáp lại bằng sự đồng ý (Sure, certainly, no problem) hoặc từ chối lịch sự kèm lý do.' };
  }
  if (lower.includes(', right?') || lower.includes(", don't you?") || lower.includes(', isn’t it?') || lower.includes(', didn’t you?') || lower.includes(', haven’t you?')) {
    return { text: 'Tag Question (...right?)', type: 'tag-question', label: 'Câu hỏi Đuôi / Xác nhận', tip: 'Tìm kiếm sự xác nhận thông tin. Thường trả lời bằng Yes/No hoặc đính chính thông tin.' };
  }
  if (lower.startsWith('do you') || lower.startsWith('did you') || lower.startsWith('have you') || lower.startsWith('is there') || lower.startsWith('are you') || lower.startsWith('has ')) {
    return { text: 'Yes/No Question', type: 'yes-no', label: 'Câu hỏi Yes/No', tip: 'Có thể trả lời trực tiếp bằng Yes/No hoặc trả lời gián tiếp bằng tình huống thực tế.' };
  }
  return { text: 'Statement / Trần thuật', type: 'statement', label: 'Câu trần thuật (Statement)', tip: 'Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại.' };
}

function classifyTrap(choiceText, qText, correctLetter, currentLetter) {
  const cLower = choiceText.toLowerCase();
  const qLower = qText.toLowerCase();

  // 1. Yes/No to Wh- question trap
  const isWh = /^(who|when|where|why|what|which|how)/i.test(qLower) && !/^(would you like|do you want)/i.test(qLower);
  if (isWh && /^(yes|no|sure|certainly)\b/i.test(cLower)) {
    return {
      trapType: 'yes_no_wh',
      trapNameVi: 'Bẫy Yes/No cho câu hỏi Wh-',
      analysisVi: `Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp.`
    };
  }

  // 2. Same sound / similar sound trap
  const qWords = qText.replace(/[^a-zA-Z\s]/g, '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const cWords = choiceText.replace(/[^a-zA-Z\s]/g, '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const commonWords = qWords.filter(w => cWords.includes(w));
  if (commonWords.length > 0) {
    return {
      trapType: 'same_sound',
      trapNameVi: `Bẫy lặp từ (${commonWords[0]})`,
      analysisVi: `Người ra đề cố tình lặp lại từ "${commonWords[0]}" để đánh lừa thí sinh nghe loáng thoáng chọn bừa.`
    };
  }

  // 3. Wrong category
  if (qLower.startsWith('where') && /(yesterday|tomorrow|monday|april|o'clock|hours|days|minutes|march)/i.test(cLower)) {
    return {
      trapType: 'wrong_tense',
      trapNameVi: 'Bẫy nhầm Khi nào (When) thay vì Ở đâu (Where)',
      analysisVi: 'Phương án này trả lời cho câu hỏi về mốc thời gian, trong khi câu hỏi hỏi về địa điểm (Where).'
    };
  }
  if (qLower.startsWith('when') && /(room|hotel|office|street|building|park|cabinet|drawer)/i.test(cLower)) {
    return {
      trapType: 'irrelevant',
      trapNameVi: 'Bẫy nhầm Ở đâu (Where) thay vì Khi nào (When)',
      analysisVi: 'Phương án này trả lời về vị trí nơi chốn, trong khi câu hỏi hỏi mốc thời gian (When).'
    };
  }
  if (qLower.startsWith('who') && /(table|flight|report|car|bus|money|dollar|shoes)/i.test(cLower)) {
    return {
      trapType: 'association',
      trapNameVi: 'Bẫy đồ vật / Lạc đề thay vì chỉ Người (Who)',
      analysisVi: 'Câu hỏi hỏi về con người (Who) nhưng phương án lại đưa ra đồ vật hoặc sự việc.'
    };
  }

  return {
    trapType: 'irrelevant',
    trapNameVi: 'Bẫy lạc đề / Không liên quan ngữ cảnh',
    analysisVi: 'Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm.'
  };
}

function parseExplanation(explanation) {
  if (!explanation) return null;
  const scriptMatch = explanation.match(/Scripts?:\s*([\s\S]*?)(?:Dịch:|$)/i);
  const scriptText = scriptMatch ? scriptMatch[1].trim() : '';

  const dichMatch = explanation.match(/Dịch:\s*([\s\S]*?)(?:=>|→|Chọn|$)/i);
  const dichText = dichMatch ? dichMatch[1].trim() : '';

  const ansMatch = explanation.match(/(?:=>|→|Chọn)\s*(?:đáp án là|đáp án)?\s*([ABC])/i);
  const correctLetter = ansMatch ? ansMatch[1].toUpperCase() : 'B';

  const qLineMatch = scriptText.match(/^(?:[MW]-[A-Za-z]+:\s*)?(.+?)(?=\n[MW]-[A-Za-z]+:\s*\(A\)|\n\(A\))/s);
  const questionText = qLineMatch ? qLineMatch[1].replace(/^[MW]-[A-Za-z]+:\s*/, '').trim() : '';

  const aMatch = scriptText.match(/\(A\)\s*([^\n]+)/);
  const bMatch = scriptText.match(/\(B\)\s*([^\n]+)/);
  const cMatch = scriptText.match(/\(C\)\s*([^\n]+)/);

  const dichQMatch = dichText.match(/^([^\n]+)/);
  const dichAMatch = dichText.match(/\(A\)\s*([^\n]+)/);
  const dichBMatch = dichText.match(/\(B\)\s*([^\n]+)/);
  const dichCMatch = dichText.match(/\(C\)\s*([^\n]+)/);

  if (!questionText || !aMatch || !bMatch || !cMatch) return null;

  return {
    questionText,
    questionTranslation: dichQMatch ? dichQMatch[1].trim() : 'Lời dịch câu hỏi',
    choiceA: aMatch[1].trim(),
    choiceB: bMatch[1].trim(),
    choiceC: cMatch[1].trim(),
    transA: dichAMatch ? dichAMatch[1].trim() : '',
    transB: dichBMatch ? dichBMatch[1].trim() : '',
    transC: dichCMatch ? dichCMatch[1].trim() : '',
    correctLetter
  };
}

async function extractFulltestClusters() {
  const quizIds = [802, 803, 804, 807, 809];
  const testNames = {
    802: 'Đề 01',
    803: 'Đề 02',
    804: 'Đề 03',
    807: 'Đề 04',
    809: 'Đề 05'
  };

  const clusters = [];

  for (const qId of quizIds) {
    const { data: qList } = await supabase
      .from('questions')
      .select('id, question_text, audio_url, answers(*)')
      .eq('quiz_id', qId)
      .order('id', { ascending: true });

    if (!qList) continue;

    const parsedQuestions = [];
    let qNum = 7;

    for (const q of qList) {
      const correctAns = q.answers?.find(a => a.is_correct);
      const parsed = parseExplanation(correctAns?.explanation);
      if (!parsed) continue;

      const stem = extractStem(parsed.questionText);
      const choices = {
        A: { text: parsed.choiceA, trans: parsed.transA },
        B: { text: parsed.choiceB, trans: parsed.transB },
        C: { text: parsed.choiceC, trans: parsed.transC },
      };

      const correctChoiceObj = choices[parsed.correctLetter] || choices.B;
      const wrongLetters = ['A', 'B', 'C'].filter(l => l !== parsed.correctLetter);
      const distractors = wrongLetters.map(l => {
        const tr = classifyTrap(choices[l].text, parsed.questionText, parsed.correctLetter, l);
        return {
          letter: l,
          text: choices[l].text,
          translation: choices[l].trans,
          trapType: tr.trapType,
          trapNameVi: tr.trapNameVi,
          analysisVi: tr.analysisVi
        };
      });

      const words = parsed.questionText.split(' ').filter(w => w.length > 3);
      const col = words.slice(-2).join(' ').replace(/[^a-zA-Z\s]/g, '') || 'important phrase';

      parsedQuestions.push({
        id: q.id,
        questionNumber: qNum++,
        audioUrl: `/api/tts?q=${encodeURIComponent(parsed.questionText)}`,
        questionText: parsed.questionText,
        questionTranslation: parsed.questionTranslation,
        questionStem: stem,
        keywordsAndCollocations: [
          {
            term: col,
            phonetic: '/collocation/',
            meaningVi: 'Cụm từ trọng tâm câu hỏi'
          }
        ],
        reflexDirection1: {
          targetMeaningVi: parsed.questionTranslation,
          questionIntent: `Xác định thông tin cho dạng ${stem.label}`,
          quickTip: `Nghe "${stem.text}" ➔ Bật ngay trọng tâm ${stem.label}!`
        },
        reflexDirection2: {
          predictedDirectDirections: [
            correctChoiceObj.text,
            'I have no idea right now.',
            'Please ask the manager.'
          ],
          commonIndirectResponses: [
            {
              vietnamesePrompt: 'Tôi không rõ lắm',
              englishResponse: "I'm not completely sure.",
              explanation: 'Dạng né tránh thông tin phổ biến trong TOEIC',
              category: 'khong_biet'
            },
            {
              vietnamesePrompt: 'Hỏi người phụ trách xem',
              englishResponse: 'Check with the department supervisor.',
              explanation: 'Dạng chuyển giao trách nhiệm',
              category: 'hoi_nguoi_khac'
            }
          ]
        },
        correctChoice: {
          letter: parsed.correctLetter,
          text: correctChoiceObj.text,
          translation: correctChoiceObj.trans,
          connectedSpeechNotes: [
            {
              segment: parsed.questionText.split(' ').slice(0, 3).join(' '),
              phoneticSpelling: 'Connected speech',
              type: 'linking',
              explanation: 'Nối âm nhanh các từ đầu câu'
            }
          ]
        },
        distractors
      });
    }

    const testLabel = testNames[qId] || `Đề ${qId}`;
    const testNum = testLabel.replace('Đề ', '');

    // Split into clusters of 5 questions each
    for (let i = 0; i < parsedQuestions.length; i += 5) {
      const chunk = parsedQuestions.slice(i, i + 5);
      if (chunk.length < 3) continue;
      const startQ = chunk[0].questionNumber;
      const endQ = chunk[chunk.length - 1].questionNumber;

      clusters.push({
        id: `fulltest-${testNum}-q${startQ}-q${endQ}`,
        title: `Đề Thi Fulltest ${testNum}: Câu ${startQ} – ${endQ}`,
        description: `Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC ${testLabel}.`,
        testSource: `ETS TOEIC ${testLabel}`,
        difficulty: i === 0 ? 'Cơ bản (500+)' : i < 15 ? 'Trung cấp (650+)' : 'Nâng cao (800+)',
        badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
        sourceType: 'fulltest',
        quizId: qId,
        questions: chunk
      });
    }
  }

  return clusters;
}

async function extractDictationClusters() {
  const clusters = [];

  // 1. Dictation Unit 1 (Quiz 31) - Cụm 01
  clusters.push({
    id: 'dictation-part2-unit1',
    title: 'Điền Từ Part 2 - Cụm 01: Nơi chốn & Người phụ trách',
    description: 'Trích từ Bài luyện nghe điền từ Part 2 (Module 12 - Phần 1). Bóc tách câu hỏi Where & Who.',
    testSource: 'Bài Luyện Nghe Điền Từ (Phần 1)',
    difficulty: 'Cơ bản (500+)',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    sourceType: 'dictation',
    quizId: 31,
    questions: [
      {
        id: 2904,
        questionNumber: 1,
        audioUrl: '/api/tts?q=Where%20was%20the%20company%20picnic%3F',
        questionText: 'Where was the company picnic?',
        questionTranslation: 'Chuyến dã ngoại của công ty đã được tổ chức ở đâu?',
        questionStem: {
          text: 'Where was',
          type: 'wh-question',
          label: 'Câu hỏi Nơi chốn (Where)',
          tip: 'Bắt buộc tìm địa điểm, công viên, phòng họp. Không bao giờ chọn Yes/No!'
        },
        keywordsAndCollocations: [
          { term: 'company picnic', phonetic: '/ˈkʌm.pə.ni ˈpɪk.nɪk/', meaningVi: 'chuyến dã ngoại công ty' },
          { term: 'next to a lake', phonetic: '/nɛkst tuː ə leɪk/', meaningVi: 'bên cạnh hồ nước' }
        ],
        reflexDirection1: {
          targetMeaningVi: 'Chuyến dã ngoại công ty đã tổ chức ở đâu?',
          questionIntent: 'Tìm địa điểm công viên / nơi chốn',
          quickTip: 'Nghe Where ➔ Bật ngay Ở ĐÂU!'
        },
        reflexDirection2: {
          predictedDirectDirections: ['At a park next to a lake.', 'In Central Park.'],
          commonIndirectResponses: [
            { vietnamesePrompt: 'Hỏi ban tổ chức xem', englishResponse: 'Ask the planning committee.', explanation: 'Chỉ người phụ trách', category: 'hoi_nguoi_khac' }
          ]
        },
        correctChoice: {
          letter: 'C',
          text: 'At a park next to a lake.',
          translation: 'Tại một công viên nằm cạnh cái hồ nước.',
          connectedSpeechNotes: [
            { segment: 'Where was the', phoneticSpelling: '/wɛərəzðə/', type: 'linking', explanation: 'Nối âm lướt' }
          ]
        },
        distractors: [
          { letter: 'A', text: 'In April.', translation: 'Vào tháng 4.', trapType: 'wrong_tense', trapNameVi: 'Bẫy thời gian (When)', analysisVi: 'Hỏi Where nhưng trả lời tháng 4 (When).' },
          { letter: 'B', text: 'Refreshments will be provided.', translation: 'Đồ ăn nhẹ sẽ được chuẩn bị.', trapType: 'association', trapNameVi: 'Bẫy liên tưởng đồ ăn picnic', analysisVi: 'Liên tưởng dã ngoại với đồ ăn nhẹ.' }
        ]
      },
      {
        id: 2905,
        questionNumber: 2,
        audioUrl: '/api/tts?q=Who%20is%20working%20at%20the%20front%20desk%20today%3F',
        questionText: "Who is working at the front desk today?",
        questionTranslation: 'Ai sẽ làm việc tại quầy lễ tân vào hôm nay vậy?',
        questionStem: {
          text: 'Who is',
          type: 'wh-question',
          label: 'Câu hỏi Người (Who)',
          tip: 'Tìm tên người cụ thể (Katie Miller), chức danh hoặc phòng ban.'
        },
        keywordsAndCollocations: [
          { term: 'front desk', phonetic: '/frʌnt dɛsk/', meaningVi: 'quầy lễ tân' }
        ],
        reflexDirection1: {
          targetMeaningVi: 'Ai làm ở quầy lễ tân hôm nay?',
          questionIntent: 'Xác định nhân viên phụ trách quầy lễ tân',
          quickTip: 'Nghe Who ➔ Bật ngay TÊN NGƯỜI!'
        },
        reflexDirection2: {
          predictedDirectDirections: ["It's Katie Miller.", 'Mr. Smith is on duty.'],
          commonIndirectResponses: [
            { vietnamesePrompt: 'Lịch trực dán ở cửa', englishResponse: 'The schedule is posted on the door.', explanation: 'Dạng gián tiếp chỉ tài liệu', category: 'chi_tai_lieu' }
          ]
        },
        correctChoice: {
          letter: 'B',
          text: "It's Katie Miller.",
          translation: 'Đó là Katie Miller.',
          connectedSpeechNotes: [
            { segment: 'Who is working', phoneticSpelling: '/huːɪz ˈwɜːkɪŋ/', type: 'linking', explanation: 'Nối Who is thành /huːɪz/' }
          ]
        },
        distractors: [
          { letter: 'A', text: "That's a difficult request.", translation: 'Đó là một yêu cầu khó.', trapType: 'irrelevant', trapNameVi: 'Bẫy lạc đề hoàn toàn', analysisVi: 'Không liên quan đến ai trực lễ tân.' },
          { letter: 'C', text: 'Make room on your desk.', translation: 'Dọn chỗ trên bàn của bạn đi.', trapType: 'same_sound', trapNameVi: 'Bẫy lặp từ (desk)', analysisVi: 'Lặp lại từ "desk" để đánh lừa tai nghe.' }
        ]
      }
    ]
  });

  // 2. Dictation from Quiz 32 (25 questions)
  const { data: qList32 } = await supabase
    .from('questions')
    .select('id, translation, answers(*)')
    .eq('quiz_id', 32)
    .order('id');

  if (qList32 && qList32.length >= 10) {
    const parsed32 = [];
    let qIdx = 1;

    for (const q of qList32) {
      const ansTexts = (q.answers || []).map(a => a.answer_text.trim());
      if (ansTexts.length < 4) continue;

      const qText = ansTexts[0].replace(/\s+\?$/, '?');
      const optA = ansTexts[1].replace(/^\(A\)\s*/, '');
      const optB = ansTexts[2].replace(/^\(B\)\s*/, '');
      const optC = ansTexts[3].replace(/^\(C\)\s*/, '');

      const transLines = (q.translation || '').split('\n').map(l => l.trim()).filter(Boolean);
      const qTrans = transLines[0] || 'Lời dịch câu hỏi';
      const transA = transLines.find(l => l.startsWith('(A)'))?.replace(/^\(A\)\s*/, '') || '';
      const transB = transLines.find(l => l.startsWith('(B)'))?.replace(/^\(B\)\s*/, '') || '';
      const transC = transLines.find(l => l.startsWith('(C)'))?.replace(/^\(C\)\s*/, '') || '';

      const stem = extractStem(qText);

      // Guess correct answer based on context or default to B
      let correctLetter = 'B';
      if (optA.includes('drawer') || optA.includes('dollars') || optA.includes('months')) correctLetter = 'A';
      else if (optC.includes('striped') || optC.includes('lake') || optC.includes('another')) correctLetter = 'C';

      const choices = {
        A: { text: optA, trans: transA },
        B: { text: optB, trans: transB },
        C: { text: optC, trans: transC },
      };
      const correctChoiceObj = choices[correctLetter] || choices.B;
      const wrongLetters = ['A', 'B', 'C'].filter(l => l !== correctLetter);
      const distractors = wrongLetters.map(l => {
        const tr = classifyTrap(choices[l].text, qText, correctLetter, l);
        return {
          letter: l,
          text: choices[l].text,
          translation: choices[l].trans,
          trapType: tr.trapType,
          trapNameVi: tr.trapNameVi,
          analysisVi: tr.analysisVi
        };
      });

      parsed32.push({
        id: q.id,
        questionNumber: qIdx++,
        audioUrl: `/api/tts?q=${encodeURIComponent(qText)}`,
        questionText: qText,
        questionTranslation: qTrans,
        questionStem: stem,
        keywordsAndCollocations: [
          {
            term: qText.split(' ').slice(-2).join(' ').replace(/[^a-zA-Z\s]/g, '') || 'key phrase',
            phonetic: '/collocation/',
            meaningVi: 'Cụm từ trọng tâm'
          }
        ],
        reflexDirection1: {
          targetMeaningVi: qTrans,
          questionIntent: `Xác định thông tin cho dạng ${stem.label}`,
          quickTip: `Nghe "${stem.text}" ➔ Bật ngay trọng tâm ${stem.label}!`
        },
        reflexDirection2: {
          predictedDirectDirections: [correctChoiceObj.text, "I haven't been informed yet."],
          commonIndirectResponses: [
            { vietnamesePrompt: 'Tôi không rõ', englishResponse: "I'm not sure.", explanation: 'Né tránh thông tin', category: 'khong_biet' }
          ]
        },
        correctChoice: {
          letter: correctLetter,
          text: correctChoiceObj.text,
          translation: correctChoiceObj.trans,
          connectedSpeechNotes: [
            {
              segment: qText.split(' ').slice(0, 3).join(' '),
              phoneticSpelling: 'Linking sound',
              type: 'linking',
              explanation: 'Nối âm tự nhiên'
            }
          ]
        },
        distractors
      });
    }

    // Split Quiz 32 into clusters of 5
    for (let i = 0; i < parsed32.length; i += 5) {
      const chunk = parsed32.slice(i, i + 5);
      if (chunk.length < 3) continue;
      const clusterNum = Math.floor(i / 5) + 2; // Cluster 02, 03...
      const startQ = chunk[0].questionNumber;
      const endQ = chunk[chunk.length - 1].questionNumber;

      clusters.push({
        id: `dictation-part2-unit${clusterNum}`,
        title: `Điền Từ Part 2 - Cụm ${clusterNum < 10 ? '0' + clusterNum : clusterNum}: Câu ${startQ} – ${endQ}`,
        description: `Trích từ Bài luyện nghe điền từ Part 2 (Module 12 - Phần 2). Rèn phản xạ câu hỏi và đáp án thường gặp.`,
        testSource: 'Bài Luyện Nghe Điền Từ (Phần 2)',
        difficulty: i === 0 ? 'Cơ bản (500+)' : 'Trung cấp (650+)',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        sourceType: 'dictation',
        quizId: 32,
        questions: chunk
      });
    }
  }

  return clusters;
}

async function run() {
  console.log('--- Đang trích xuất toàn bộ dữ liệu Part 2 Fulltest & Dictation ---');
  const fulltestClusters = await extractFulltestClusters();
  console.log(`Đã trích xuất ${fulltestClusters.length} cụm câu hỏi Fulltest.`);

  const dictationClusters = await extractDictationClusters();
  console.log(`Đã trích xuất ${dictationClusters.length} cụm câu hỏi Dictation.`);

  const allClusters = [...dictationClusters, ...fulltestClusters];
  console.log(`Tổng cộng: ${allClusters.length} cụm câu hỏi.`);

  const fileContent = `import { Part2Cluster, Part2StepMeta } from "@/types/part2Coach";

export const PART2_STEPS_META: Part2StepMeta[] = [
  {
    id: 1,
    name: "Nghe thử cụm câu hỏi",
    shortName: "Nghe thử",
    subtitle: "Làm quen ngữ cảnh & Đo tai nghe",
    description: "Nghe 1 lượt câu hỏi cùng 3 đáp án (A, B, C) ở tốc độ thực tế để tự đánh giá tai mình bắt được bao nhiêu % nội dung.",
    iconName: "Headphones",
    badge: "Bước 1",
  },
  {
    id: 2,
    name: "Cụm từ chức năng (Chunks)",
    shortName: "Từ khóa & Chunks",
    subtitle: "Bẻ nhỏ từ để hỏi & Collocations",
    description: "Bóc tách 2 nhóm từ quan trọng nhất: Từ để hỏi / Trợ động từ và Từ vựng chủ đề. Lặp lại to 3 lần kèm nghĩa tiếng Việt.",
    iconName: "Layers",
    badge: "Bước 2",
  },
  {
    id: 3,
    name: "Phản xạ Chiều 1: Nghe hiểu tức thì",
    shortName: "Phản xạ Hỏi (1s)",
    subtitle: "1 Giây bật nghĩa & Dạng câu hỏi",
    description: "Nghe câu hỏi tiếng Anh → đếm ngược 1 giây → lập tức bật to nghĩa tiếng Việt hoặc xác định mục tiêu câu hỏi cần tìm.",
    iconName: "Zap",
    badge: "Bước 3",
  },
  {
    id: 4,
    name: "Phản xạ Chiều 2: Bật câu trả lời",
    shortName: "Phản xạ Đáp",
    subtitle: "Đoán hướng & Phản xạ gián tiếp",
    description: "Tập đoán trước hướng trả lời và luyện phản xạ với các câu trả lời gián tiếp phổ biến (Tôi không biết, Hỏi David xem, Lịch bị dời...).",
    iconName: "MessageSquareShare",
    badge: "Bước 4",
  },
  {
    id: 5,
    name: "Shadowing Cặp Đúng (3-5 lần)",
    shortName: "Shadowing Cặp Đúng",
    subtitle: "Nối âm, nuốt âm & Nhại ngữ điệu",
    description: "Vòng 1: Nghe và nhìn tapescript có đánh dấu nối âm/nuốt âm. Vòng 2 & 3: Ẩn script, nghe và nhại lại (Shadowing) theo ngữ điệu bản xứ.",
    iconName: "Mic",
    badge: "Bước 5",
  },
  {
    id: 6,
    name: "Bóc mẽ bẫy phương án sai",
    shortName: "Nhận diện bẫy",
    subtitle: "Bẫy đồng âm, sai thì, Yes/No",
    description: "Phân tích nhanh lý do sai của 2 đáp án còn lại: Bẫy lặp từ/từ đồng âm, bẫy sai thì, bẫy Yes/No cho câu hỏi Wh-...",
    iconName: "ShieldAlert",
    badge: "Bước 6",
  },
  {
    id: 7,
    name: "Nghe liên tục toàn bài (Loop)",
    shortName: "Nghe thụ động",
    subtitle: "Tạo phản xạ thụ động vô thức",
    description: "Trình phát audio tự động phát lặp lại toàn bộ cụm câu hỏi + đáp án đúng liên tục, tùy chỉnh tốc độ để ngấm ngữ điệu.",
    iconName: "Repeat",
    badge: "Bước 7",
  },
];

export const PART2_CLUSTERS: Part2Cluster[] = ${JSON.stringify(allClusters, null, 2)};
`;

  fs.writeFileSync('src/data/part2CoachData.ts', fileContent, 'utf8');
  console.log('✅ ĐÃ GHI THÀNH CÔNG VÀO src/data/part2CoachData.ts!');
}

run().catch(console.error);
