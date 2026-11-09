import {
  buildGroups,
  classifyGrammar,
  classifyPart1,
  classifyPart2,
  classifyPart34,
  classifyPart6,
  classifyPart7Structure,
  classifyPassageType,
  part2Stem,
  tagPart,
  type TaggerQuestion,
  yearFromTitle,
} from './question-tagger';

let nextId = 1;
const ans = (...texts: string[]) =>
  texts.map((t, i) => ({ id: nextId++, answerText: t, isCorrect: i === 0 }));
const q = (over: Partial<TaggerQuestion> = {}): TaggerQuestion => ({
  id: nextId++,
  displayOrder: 0,
  questionText: null,
  passageText: null,
  transcript: null,
  audioUrl: null,
  imageUrl: null,
  groupId: null,
  answers: ans('A', 'B', 'C', 'D'),
  ...over,
});

describe('classifyPart2', () => {
  it.each([
    ['Where is the nearest post office?', 'wh'],
    ['When does the meeting start?', 'wh'],
    ['Did you send the invoice yesterday?', 'yes_no'],
    ['Would you like coffee or tea?', 'choice'],
    ['Should we take a taxi or the subway?', 'choice'],
    ['Could you help me move these boxes?', 'request'],
    ["Why don't we order lunch now?", 'suggestion'],
    ['How about meeting on Friday?', 'suggestion'],
    ["You finished the report, didn't you?", 'tag'],
    ['The printer is out of paper again.', 'statement'],
    ['', 'other'],
  ])('%s → %s', (stem, expected) => {
    expect(classifyPart2(stem.toLowerCase())).toBe(expected);
  });

  it('lấy câu hỏi từ transcript khi question_text là "Mark your answer"', () => {
    const stem = part2Stem(
      q({
        questionText: 'Mark your answer on your answer sheet.',
        transcript:
          'Where did you put the files? (A) In the cabinet. (B) Yes, I did.',
      }),
    );
    expect(classifyPart2(stem)).toBe('wh');
  });
});

describe('classifyPart1', () => {
  it('nhận tranh một người / nhiều người / đồ vật', () => {
    expect(
      classifyPart1(
        q({
          answers: ans(
            '(A) A woman is typing.',
            '(B) She is reading.',
            '(C) A man is sitting.',
            '(D) The chair is empty.',
          ),
        }),
      ),
    ).toBe('single_person');
    expect(
      classifyPart1(
        q({
          answers: ans(
            'They are shaking hands.',
            'Some people are walking.',
            'Workers are fixing a roof.',
            'A man is driving.',
          ),
        }),
      ),
    ).toBe('multiple_people');
    expect(
      classifyPart1(
        q({
          answers: ans(
            'Some boxes are stacked.',
            'A lamp is on the desk.',
            'The door is open.',
            'Plants are in pots.',
          ),
        }),
      ),
    ).toBe('objects_scene');
    expect(
      classifyPart1(
        q({
          answers: ans(
            'A lamp is on the desk.',
            'The door is open.',
            'Chairs are arranged.',
            'A boat is docked.',
          ),
        }),
      ),
    ).toBe('objects_scene');
  });
});

describe('classifyPart34', () => {
  it.each([
    ['What is the conversation mainly about?', 'main_idea'],
    ['Why is the woman calling?', 'main_idea'],
    ['Who most likely is the man?', 'speaker'],
    ['Where do the speakers most likely work?', 'speaker'],
    ['What will the man probably do next?', 'next_action'],
    ['What does the woman imply when she says, "That\'s a lot"?', 'inference'],
    ['What does the man suggest the woman do?', 'request'],
    ['Look at the graphic. Which room will the meeting be in?', 'graphic'],
    ['How much does the ticket cost?', 'detail'],
  ])('%s → %s', (text, expected) => {
    expect(classifyPart34(text)).toBe(expected);
  });
});

describe('classifyGrammar (Part 5)', () => {
  it.each([
    [['he', 'him', 'his', 'himself'], 'pronoun'],
    [['although', 'despite', 'because', 'during'], 'prep_conj'],
    [['success', 'successful', 'successfully', 'succeed'], 'word_form'],
    [['will submit', 'submitted', 'has submitted', 'submitting'], 'verb_tense'],
    [['schedule', 'reservation', 'payment', 'agenda'], 'vocabulary'],
  ])('%j → %s', (opts, expected) => {
    expect(classifyGrammar(ans(...opts))).toBe(expected);
  });

  it('Part 6 nhận câu chèn khi các lựa chọn là câu dài', () => {
    expect(
      classifyPart6(
        q({
          answers: ans(
            'We look forward to seeing you there.',
            'The store will be closed on Monday.',
            'Please contact us for more details.',
            'Our staff were very helpful yesterday.',
          ),
        }),
      ),
    ).toBe('sentence_insertion');
  });
});

describe('Part 7', () => {
  it('cấu trúc theo vị trí khi đủ Part', () => {
    expect(classifyPart7Structure(0, 54, 2)).toBe('single');
    expect(classifyPart7Structure(30, 54, 5)).toBe('double');
    expect(classifyPart7Structure(45, 54, 5)).toBe('triple');
  });

  it.each([
    [
      'Questions 147-148 refer to the following e-mail. To: ... From: ...',
      'email',
    ],
    [
      'Questions 150-151 refer to the following text-message chain.',
      'text_message',
    ],
    [
      'Questions 152-154 refer to the following advertisement.',
      'advertisement',
    ],
    ['Questions 155-157 refer to the following article.', 'article'],
    ['Questions 158-160 refer to the following notice.', 'notice'],
    ['Questions 161-163 refer to the following schedule.', 'form_schedule'],
    ['Some unrelated text', 'other'],
  ])('%s → %s', (passage, expected) => {
    expect(classifyPassageType(passage)).toBe(expected);
  });
});

describe('buildGroups / tagPart', () => {
  it('Part 3 nhóm 3 câu theo audio, giữ ngữ cảnh chung', () => {
    const qs = [1, 2, 3, 4, 5, 6].map((i) =>
      q({
        displayOrder: i,
        questionText: 'What is the conversation mainly about?',
        audioUrl: i <= 3 ? 'a1.mp3' : 'a2.mp3',
      }),
    );
    expect(buildGroups(3, qs).map((g) => g.length)).toEqual([3, 3]);
    const share = new Map([
      ['a1.mp3', 3],
      ['a2.mp3', 3],
    ]);
    const tags = tagPart(9, 3, qs, share);
    expect(tags.every((t) => t.practiceEligible)).toBe(true);
    expect(new Set(tags.map((t) => t.groupKey)).size).toBe(2);
  });

  it('audio dùng chung cả Part → không luyện riêng được', () => {
    const qs = [1, 2, 3, 4, 5, 6].map(() =>
      q({ audioUrl: 'part2.mp3', questionText: 'Mark your answer.' }),
    );
    const tags = tagPart(9, 2, qs, new Map([['part2.mp3', 6]]));
    expect(tags.some((t) => t.practiceEligible)).toBe(false);
  });

  it('Part 7 câu sau dùng đoạn văn của câu đầu nhóm; thiếu đáp án đúng → không luyện', () => {
    const first = q({
      groupId: 'x',
      passageText: 'Questions refer to the following memo.',
    });
    const second = q({ groupId: 'x' });
    const broken = q({
      groupId: 'x',
      answers: ans('a', 'b').map((a) => ({ ...a, isCorrect: false })),
    });
    const tags = tagPart(9, 7, [first, second, broken], new Map());
    expect(tags.map((t) => t.practiceEligible)).toEqual([true, true, false]);
    expect(tags[1].passageType).toBe('memo');
  });
});

describe('yearFromTitle', () => {
  it('đọc năm trong tiêu đề', () => {
    expect(yearFromTitle('Bộ đề thi thử sát đề thi thật 2024 - Đề số 01')).toBe(
      2024,
    );
    expect(yearFromTitle('Đề tổng hợp')).toBeNull();
  });
});
