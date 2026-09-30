import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

function extractStem(qText) {
  const lower = qText.toLowerCase().trim();
  if (lower.startsWith('where is') || lower.startsWith("where's")) return { text: 'Where is / Where are', type: 'wh-question', label: 'Câu hỏi Nơi chốn (Where)', tip: 'Tìm giới từ chỉ nơi chốn (at, in, on, next to...) hoặc địa điểm. Không bao giờ chọn Yes/No!' };
  if (lower.startsWith('where')) return { text: 'Where', type: 'wh-question', label: 'Câu hỏi Nơi chốn (Where)', tip: 'Tìm vị trí, phòng ban, địa chỉ. Không bao giờ chọn Yes/No!' };
  if (lower.startsWith('when does') || lower.startsWith('when will') || lower.startsWith('when is') || lower.startsWith("when's") || lower.startsWith('when')) return { text: 'When', type: 'wh-question', label: 'Câu hỏi Thời gian (When)', tip: 'Tìm mốc thời gian (giờ, ngày, buổi, liên từ until/after/before). Tuyệt đối tránh Yes/No!' };
  if (lower.startsWith('who should') || lower.startsWith('who sent') || lower.startsWith('who is') || lower.startsWith("who's") || lower.startsWith('who')) return { text: 'Who', type: 'wh-question', label: 'Câu hỏi Người (Who)', tip: 'Tìm tên người, chức danh (manager, assistant), phòng ban hoặc câu gián tiếp.' };
  if (lower.startsWith('why was') || lower.startsWith('why did') || lower.startsWith('why is') || lower.startsWith('why')) return { text: 'Why', type: 'wh-question', label: 'Câu hỏi Lý do (Why)', tip: 'Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!' };
  if (lower.startsWith('what time')) return { text: 'What time', type: 'wh-question', label: 'Câu hỏi Giờ giấc cụ thể', tip: 'Tìm mốc giờ cụ thể (at 6 o’clock, after 2 PM) hoặc giờ mở/đóng cửa.' };
  if (lower.startsWith('what')) return { text: 'What', type: 'wh-question', label: 'Câu hỏi Thông tin (What)', tip: 'Bắt danh từ trọng tâm hoặc thông tin được yêu cầu.' };
  if (lower.startsWith('how long')) return { text: 'How long', type: 'wh-question', label: 'Câu hỏi Khoảng thời gian', tip: 'Tìm khoảng thời gian (for 2 weeks, three days), khác với When (mốc thời gian).' };
  if (lower.startsWith('how much') || lower.startsWith('how many')) return { text: 'How much / How many', type: 'wh-question', label: 'Câu hỏi Số lượng / Giá cả', tip: 'Tìm con số hoặc giá tiền ($50, ten copies).' };
  if (lower.startsWith('how')) return { text: 'How', type: 'wh-question', label: 'Câu hỏi Phương thức (How)', tip: 'Tìm phương tiện (by bus, online) hoặc cách thức thực hiện.' };
  if (lower.startsWith('would you like') || lower.startsWith('do you want')) return { text: 'Would you like ...', type: 'choice-or', label: 'Câu hỏi Mời / Lựa chọn', tip: 'Nếu có OR: Chọn 1 trong 2 hoặc Either way (cái nào cũng được). Nếu là lời mời: Sure, I’d love to / No thanks.' };
  if (lower.startsWith('will you') || lower.startsWith('can you') || lower.startsWith('could you')) return { text: 'Can / Could / Will you', type: 'request-offer', label: 'Câu hỏi Yêu cầu / Đề nghị', tip: 'Đáp lại sự đồng ý (Sure, certainly, no problem) hoặc từ chối lịch sự.' };
  if (lower.includes(', right?') || lower.includes(", don't you?") || lower.includes(', isn’t it?') || lower.includes(', didn’t you?')) return { text: 'Tag Question (...right?)', type: 'tag-question', label: 'Câu hỏi Đuôi / Xác nhận', tip: 'Tìm kiếm sự xác nhận thông tin. Thường trả lời bằng Yes/No hoặc đính chính thông tin.' };
  if (lower.startsWith('do you') || lower.startsWith('did you') || lower.startsWith('have you') || lower.startsWith('is there') || lower.startsWith('are you')) return { text: 'Yes/No Question', type: 'yes-no', label: 'Câu hỏi Yes/No', tip: 'Có thể trả lời trực tiếp bằng Yes/No hoặc trả lời gián tiếp bằng tình huống thực tế.' };
  return { text: 'Statement / Trần thuật', type: 'statement', label: 'Câu trần thuật (Statement)', tip: 'Bày tỏ quan điểm hoặc đưa ra sự thật. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại.' };
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
      analysisVi: `Câu hỏi bắt đầu bằng đại từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp.`
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

  // 3. Wrong tense / purpose
  if (qLower.startsWith('where') && /(yesterday|tomorrow|monday|april|o'clock|hours|days|minutes)/i.test(cLower)) {
    return {
      trapType: 'wrong_tense',
      trapNameVi: 'Bẫy nhầm Khi nào (When) thay vì Ở đâu (Where)',
      analysisVi: 'Phương án này trả lời cho câu hỏi về mốc thời gian, trong khi câu hỏi hỏi về địa điểm (Where).'
    };
  }
  if (qLower.startsWith('when') && /(room|hotel|office|street|building|park|cabinet)/i.test(cLower)) {
    return {
      trapType: 'irrelevant',
      trapNameVi: 'Bẫy nhầm Ở đâu (Where) thay vì Khi nào (When)',
      analysisVi: 'Phương án này trả lời về vị trí nơi chốn, trong khi câu hỏi hỏi mốc thời gian (When).'
    };
  }
  if (qLower.startsWith('who') && /(table|flight|report|car|bus|money|dollar)/i.test(cLower)) {
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

async function buildClusters() {
  console.log('Đang trích xuất câu hỏi từ Supabase...');
  
  // Quizzes 802, 803, 804 (Fulltest ETS 100% audio chuẩn)
  const quizIds = [802, 803, 804];
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

      // Simple connected speech note
      const connectedSpeechNotes = [
        {
          segment: parsed.questionText.split(' ').slice(0, 3).join(' '),
          phoneticSpelling: 'Connected speech',
          type: 'linking',
          explanation: 'Nối âm nhanh các từ đầu câu tạo thành một chuỗi âm tiết'
        }
      ];

      parsedQuestions.push({
        id: q.id,
        questionNumber: qNum++,
        audioUrl: q.audio_url || 'https://storage.googleapis.com/comaiphuong-edu-media/sound/546634354-1692589884697-part2mp31.mp3',
        questionText: parsed.questionText,
        questionTranslation: parsed.questionTranslation,
        questionStem: stem,
        keywordsAndCollocations: [
          {
            term: parsed.questionText.split(' ').slice(-2).join(' ').replace(/[^a-zA-Z\s]/g, ''),
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
            'I have no idea at the moment.',
            'Please ask the manager.'
          ],
          commonIndirectResponses: [
            {
              vietnamesePrompt: 'Tôi không chắc lắm',
              englishResponse: 'I’m not entirely sure.',
              explanation: 'Dạng né tránh thông tin',
              category: 'khong_biet'
            },
            {
              vietnamesePrompt: 'Hỏi người phụ trách xem',
              englishResponse: 'Check with the supervisor.',
              explanation: 'Dạng chuyển giao trách nhiệm',
              category: 'hoi_nguoi_khac'
            }
          ]
        },
        correctChoice: {
          letter: parsed.correctLetter,
          text: correctChoiceObj.text,
          translation: correctChoiceObj.trans,
          connectedSpeechNotes
        },
        distractors
      });
    }

    console.log(`Quiz ${qId}: Parsed ${parsedQuestions.length} câu.`);

    // Split into clusters of 5 questions each
    for (let i = 0; i < parsedQuestions.length; i += 5) {
      const chunk = parsedQuestions.slice(i, i + 5);
      if (chunk.length < 3) continue;
      const startQ = chunk[0].questionNumber;
      const endQ = chunk[chunk.length - 1].questionNumber;
      const testNum = qId === 802 ? '01' : qId === 803 ? '02' : '03';

      clusters.push({
        id: `fulltest-${testNum}-q${startQ}-q${endQ}`,
        title: `Đề Thi Fulltest ${testNum}: Câu ${startQ} – ${endQ}`,
        description: `Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề số ${testNum}.`,
        testSource: `ETS TOEIC Đề ${testNum}`,
        difficulty: i === 0 ? 'Cơ bản (500+)' : i < 15 ? 'Trung cấp (650+)' : 'Nâng cao (800+)',
        badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
        sourceType: 'fulltest',
        quizId: qId,
        questions: chunk
      });
    }
  }

  console.log(`Đã tạo thành công ${clusters.length} cụm câu hỏi từ Fulltest.`);
  return clusters;
}

buildClusters().then(clusters => {
  fs.writeFileSync('scripts/generated_clusters.json', JSON.stringify(clusters, null, 2));
  console.log('Đã lưu scripts/generated_clusters.json!');
}).catch(console.error);
