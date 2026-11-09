/**
 * Gắn nhãn tự động cho câu hỏi Full Test (thuần, không đụng DB — có unit test).
 * - Nhóm câu (Part 3/4/6/7) theo đúng logic hiển thị của `FullTestExam.tsx` (groupedQuestions).
 * - Phân loại dạng câu theo quy tắc trên chữ của câu hỏi/đáp án/transcript.
 * - Quyết định câu có luyện riêng được không (đủ đáp án, có audio/ảnh/đoạn văn cần thiết).
 * Admin sửa được nhãn; dòng do admin sửa (`tag_source = 'admin'`) không bị ghi đè.
 */

export interface TaggerAnswer {
  id: number;
  answerText: string | null;
  isCorrect: boolean | null;
}

export interface TaggerQuestion {
  id: number;
  displayOrder: number;
  questionText: string | null;
  passageText: string | null;
  transcript: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  groupId: string | null;
  answers: TaggerAnswer[];
}

export interface QuestionTags {
  questionId: number;
  toeicPart: number;
  groupKey: string;
  partIndex: number;
  questionCategory: string;
  passageType: string | null;
  practiceEligible: boolean;
}

export interface QuestionContext {
  passage: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
}

/** Tách `[PASSAGE]...[ENDPASSAGE]` khỏi nội dung câu như `FullTestExam.tsx`. */
export function splitPassage(questionText: string | null): {
  passage: string | null;
  text: string;
} {
  const raw = questionText ?? '';
  if (raw.includes('[PASSAGE]')) {
    const [head, tail] = raw.split('[ENDPASSAGE]');
    return {
      passage: head.replace('[PASSAGE]', '').trim() || null,
      text: (tail ?? '').trim(),
    };
  }
  return { passage: null, text: raw };
}

/**
 * Nhóm câu của MỘT Part (đã sắp `display_order`, `id`) giống `groupedQuestions` ở FullTestExam:
 * Part 3/4 theo group_id / audio đổi / tối đa 3 câu; Part 6/7 theo group_id / có đoạn văn mới /
 * Part 6 tối đa 4, Part 7 tối đa 5; Part 1/2/5 mỗi câu một nhóm.
 */
export function buildGroups<T extends TaggerQuestion>(
  part: number,
  questions: T[],
): T[][] {
  const groups: T[][] = [];
  let current: {
    items: T[];
    groupId: string | null;
    audioUrl: string | null;
  } | null = null;
  const isPart34 = part === 3 || part === 4;
  const isPart67 = part === 6 || part === 7;

  for (const q of questions) {
    const passage = q.passageText || splitPassage(q.questionText).passage || '';
    let startNew = false;
    if (!current) startNew = true;
    else if (isPart34) {
      if (q.groupId && q.groupId !== current.groupId) startNew = true;
      else if (!q.groupId && q.audioUrl && q.audioUrl !== current.audioUrl)
        startNew = true;
      else if (current.items.length >= 3) startNew = true;
    } else if (isPart67) {
      if (q.groupId && q.groupId !== current.groupId) startNew = true;
      else if (!q.groupId && passage) startNew = true;
      else if (current.items.length >= 4 && part === 6) startNew = true;
      else if (!q.groupId && part === 7 && current.items.length >= 5)
        startNew = true;
    } else startNew = true;

    if (startNew) {
      current = { items: [], groupId: q.groupId, audioUrl: q.audioUrl };
      groups.push(current.items);
    }
    current!.items.push(q);
  }
  return groups;
}

/** Ngữ cảnh chung của nhóm: đoạn văn / audio / ảnh đầu tiên có trong nhóm. */
export function groupContext(group: TaggerQuestion[]): QuestionContext {
  let passage: string | null = null;
  let audioUrl: string | null = null;
  let imageUrl: string | null = null;
  for (const q of group) {
    passage ??= q.passageText?.trim() || splitPassage(q.questionText).passage;
    audioUrl ??= q.audioUrl || null;
    imageUrl ??= q.imageUrl || null;
  }
  return { passage, audioUrl, imageUrl };
}

const norm = (s: string | null | undefined) =>
  (s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const words = (s: string) => s.match(/[a-z']+/g) ?? [];

/** Chữ thật của đáp án (bỏ "(A)", "A." ở đầu); đáp án chỉ là chữ cái → rỗng. */
function optionTexts(answers: TaggerAnswer[]): string[] {
  return answers
    .map((a) => norm(a.answerText).replace(/^\(?[a-d][).:]\s*/, ''))
    .filter((t) => t.length > 1);
}

const MARK_YOUR_ANSWER = /^mark your answer/;

/** Câu hỏi Part 2: question_text nếu có nghĩa, không thì câu đầu của transcript. */
export function part2Stem(q: TaggerQuestion): string {
  const text = norm(splitPassage(q.questionText).text);
  if (
    text.length > 3 &&
    !MARK_YOUR_ANSWER.test(text) &&
    !/^question \d+$/.test(text)
  )
    return text;
  const t = norm(q.transcript);
  const cut = t.split(/\(a\)|\n|(?<=[?.!])\s+(?=[a-z])/)[0] ?? '';
  return cut.replace(/^(m|w|man|woman|m-\w+|w-\w+)\s*[:-]\s*/, '').trim();
}

const AUX_START =
  /^(do|does|did|is|are|was|were|have|has|had|will|would|can|could|should|shall|may|might|must|am|isn't|aren't|wasn't|weren't|don't|doesn't|didn't|haven't|hasn't|won't|can't|couldn't|shouldn't)\b/;

export function classifyPart2(stem: string): string {
  const s = stem.trim();
  if (!s) return 'other';
  const isQuestion = s.includes('?');
  if (
    /,\s*(isn't|aren't|wasn't|weren't|don't|doesn't|didn't|haven't|hasn't|won't|can't|couldn't|shouldn't|wouldn't|is|are|was|were|do|does|did|have|has|will|can|right)\s+\w+\s*\?\s*$/.test(
      s,
    ) ||
    /,\s*right\s*\?\s*$/.test(s)
  ) {
    return 'tag';
  }
  const isWh = /^(who|whom|whose|what|when|where|why|which|how)\b/.test(s);
  // Câu hỏi lựa chọn (A or B) trước gợi ý/yêu cầu: 'Would you like coffee or tea?'
  if (isQuestion && /\bor\b/.test(s) && !isWh) return 'choice';
  if (
    /^(why don't (you|we)|how about|what about|let's|shall we|would you like|why not|should we)\b/.test(
      s,
    )
  ) {
    return 'suggestion';
  }
  if (
    /^(could|can|would|will) you\b|^would you mind|^do you mind|^please\b|^i'd like you to|^can i ask you/.test(
      s,
    )
  ) {
    return 'request';
  }
  if (isWh) return 'wh';
  if (AUX_START.test(s) && isQuestion) {
    if (
      /\b(who|what|when|where|why|which|how)\b/.test(
        s.split(' ').slice(2).join(' '),
      )
    )
      return 'other';
    return 'yes_no';
  }
  if (!isQuestion) return 'statement';
  return 'other';
}

export function classifyPart1(q: TaggerQuestion): string {
  const texts = optionTexts(q.answers);
  const source = texts.length >= 2 ? texts : [norm(q.transcript)];
  let single = 0;
  let multi = 0;
  for (const t of source) {
    if (
      /\b(they|people|men|women|workers|group|both|customers|travelers|passengers|diners|shoppers|pedestrians|colleagues)\b/.test(
        t,
      )
    )
      multi++;
    else if (
      /\b(he|she|his|her|a man|a woman|the man|the woman|man's|woman's|person|someone)\b/.test(
        t,
      )
    )
      single++;
  }
  if (multi === 0 && single === 0) return 'objects_scene';
  return multi > single ? 'multiple_people' : 'single_person';
}

export function classifyPart34(questionText: string | null): string {
  const s = norm(splitPassage(questionText).text);
  if (/look at the (graphic|graph|chart|map|table|schedule)/.test(s))
    return 'graphic';
  if (
    /(mainly|main) (about|discussing|purpose|topic)|purpose of the|what is the (talk|conversation|announcement|message|broadcast|speech) (mainly )?about|why is the (speaker|man|woman) calling|what are the speakers (mainly )?discussing|what is the topic/.test(
      s,
    )
  ) {
    return 'main_idea';
  }
  const isSpeaker =
    (/^who (is|are|most likely|probably)\b/.test(s) &&
      /\b(speakers?|man|woman|listeners?|caller|men|women)\b/.test(s)) ||
    (/^where (does|do|is|are|most likely|probably)\b/.test(s) &&
      /\b(work|works|take place|taking place|located|most likely|probably)\b/.test(
        s,
      )) ||
    /\b(job|occupation|profession|work for|works for)\b/.test(s) ||
    /what (kind|type) of (business|company|store|organization|event)/.test(s);
  if (isSpeaker) return 'speaker';
  if (
    /\bnext\b|will (probably|most likely) (do|happen)|what (does|did) the (man|woman|speaker) say (he|she|they) will do|what will (the )?(man|woman|speaker|listeners?) (probably |most likely )?do|what (is|are) .* (going|planning) to do|what will happen/.test(
      s,
    )
  ) {
    return 'next_action';
  }
  if (
    /\bimply|\bmean when|\binfer|suggest about|what can be (inferred|concluded)/.test(
      s,
    )
  )
    return 'inference';
  if (
    /\b(ask|asks|asked|request|requests|suggest|suggests|recommend|recommends|offer|offers|advise|advises|invite|invites|encourage|encourages|remind|reminds|propose)\b/.test(
      s,
    )
  ) {
    return 'request';
  }
  return 'detail';
}

const PRONOUNS = new Set(
  'i me my mine myself you your yours yourself yourselves he him his himself she her hers herself it its itself we us our ours ourselves they them their theirs themselves who whom whose which that whoever whatever one oneself each other another others'.split(
    ' ',
  ),
);
const CONNECTORS = new Set(
  'in on at by for with from to of about into onto upon within without through throughout during until till since before after above below between among across along around behind beside besides beyond despite although though even because unless while whereas whether if as so but and or nor yet however therefore moreover furthermore nevertheless otherwise instead meanwhile consequently thus hence once whenever wherever than rather unlike like toward towards against except per via regarding concerning following prior due owing'.split(
    ' ',
  ),
);
const AUX =
  /\b(will|would|has|have|had|is|are|was|were|been|being|be|shall|should|can|could|may|might|must|to)\b/;

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** Part 5 (và câu ngữ pháp Part 6) theo 4 lựa chọn. */
export function classifyGrammar(answers: TaggerAnswer[]): string {
  const opts = optionTexts(answers);
  if (opts.length < 3) return 'vocabulary';
  const isSet = (set: Set<string>) =>
    opts.filter((o) => {
      const w = words(o);
      return w.length > 0 && w.every((x) => set.has(x));
    }).length >= 3;
  if (isSet(PRONOUNS)) return 'pronoun';
  if (isSet(CONNECTORS)) return 'prep_conj';

  const heads = opts.map((o) => {
    const w = words(o);
    return w[w.length - 1] ?? '';
  });
  let sharedStem = 0;
  for (let i = 0; i < heads.length; i++) {
    let matches = 0;
    for (let j = 0; j < heads.length; j++) {
      if (
        i !== j &&
        commonPrefix(heads[i], heads[j]) >= Math.min(4, heads[i].length)
      )
        matches++;
    }
    sharedStem = Math.max(sharedStem, matches + 1);
  }
  if (sharedStem >= 3) {
    const multiWordWithAux = opts.filter(
      (o) => words(o).length > 1 && AUX.test(o),
    ).length;
    return multiWordWithAux >= 1 ? 'verb_tense' : 'word_form';
  }
  return 'vocabulary';
}

export function classifyPart6(q: TaggerQuestion): string {
  const opts = optionTexts(q.answers);
  if (opts.length >= 3) {
    const avgWords =
      opts.reduce((n, o) => n + words(o).length, 0) / opts.length;
    if (avgWords >= 5) return 'sentence_insertion';
  }
  return classifyGrammar(q.answers);
}

export function classifyPassageType(passage: string | null): string | null {
  const p = norm(passage);
  if (!p) return null;
  const intro = p.slice(0, 300);
  const pick = (re: RegExp) => re.test(intro);
  if (
    pick(/text[- ]message|online chat|chat discussion|instant message/) ||
    /\[\d{1,2}:\d{2}\s*[ap]\.?m\.?\]/.test(p)
  )
    return 'text_message';
  if (pick(/following (e-?mails?)\b/)) return 'email';
  if (pick(/following (letter)/)) return 'letter';
  if (pick(/following (memo|memorandum)/)) return 'memo';
  if (pick(/following (advertisement|ad\b|flyer|brochure|coupon)/))
    return 'advertisement';
  if (pick(/following (article|press release|review|newsletter)/))
    return 'article';
  if (pick(/following (notice|announcement|information|bulletin|sign)/))
    return 'notice';
  if (pick(/following (web ?page|website|online)/)) return 'web_page';
  if (
    pick(
      /following (form|schedule|invoice|itinerary|table|receipt|agenda|survey|chart|list|timetable|order|application|label|calendar|program)/,
    )
  )
    return 'form_schedule';
  if (/\bsubject\s*:/.test(intro) && /\b(to|from)\s*:/.test(intro))
    return 'email';
  if (/^dear\b/.test(p)) return 'letter';
  if (/\bmemo(randum)?\b/.test(intro)) return 'memo';
  return 'other';
}

/** Part 7 theo vị trí trong Part (đề đủ 54 câu: 147–175 đơn, 176–185 đôi, 186–200 ba). */
export function classifyPart7Structure(
  partIndex: number,
  partSize: number,
  groupSize: number,
): string {
  if (partSize >= 50) {
    if (partIndex < 29) return 'single';
    if (partIndex < 39) return 'double';
    return 'triple';
  }
  return groupSize >= 5 ? 'double' : 'single';
}

function hasValidAnswers(q: TaggerQuestion): boolean {
  return (
    q.answers.length >= 2 &&
    q.answers.filter((a) => a.isCorrect === true).length === 1
  );
}

/**
 * Gắn nhãn mọi câu của MỘT Part trong một đề. `audioShareCount`: số câu trong đề dùng chung
 * từng URL audio — audio cả Part (một file cho cả Part 1+2) không phát riêng được từng câu
 * nên câu đó không đưa vào luyện riêng.
 */
export function tagPart(
  testId: number,
  part: number,
  questions: TaggerQuestion[],
  audioShareCount: Map<string, number>,
): QuestionTags[] {
  const groups = buildGroups(part, questions);
  const out: QuestionTags[] = [];
  let index = 0;
  groups.forEach((group, gi) => {
    const ctx = groupContext(group);
    const groupKey = `${testId}:${part}:${group[0].groupId ? `g${group[0].groupId}` : gi}`;
    const passageType = part === 7 ? classifyPassageType(ctx.passage) : null;
    for (const q of group) {
      let category: string;
      switch (part) {
        case 1:
          category = classifyPart1(q);
          break;
        case 2:
          category = classifyPart2(part2Stem(q));
          break;
        case 3:
        case 4:
          category = classifyPart34(q.questionText);
          break;
        case 5:
          category = classifyGrammar(q.answers);
          break;
        case 6:
          category = classifyPart6(q);
          break;
        default:
          category = classifyPart7Structure(
            index,
            questions.length,
            group.length,
          );
      }

      const audio = q.audioUrl || ctx.audioUrl;
      let eligible = hasValidAnswers(q);
      if (part <= 4) {
        eligible &&= !!audio && (audioShareCount.get(audio) ?? 0) <= 5;
        if (part === 1) eligible &&= !!(q.imageUrl || ctx.imageUrl);
      } else if (part === 5) {
        eligible &&= norm(splitPassage(q.questionText).text).length > 0;
      } else {
        eligible &&= !!ctx.passage;
      }

      out.push({
        questionId: q.id,
        toeicPart: part,
        groupKey,
        partIndex: index,
        questionCategory: category,
        passageType: part === 7 ? (passageType ?? 'other') : null,
        practiceEligible: eligible,
      });
      index++;
    }
  });
  return out;
}

/** Năm của đề lấy từ tiêu đề ("... 2024 - Đề số 01"). */
export function yearFromTitle(title: string): number | null {
  const m = title.match(/\b(20[1-3]\d)\b/);
  return m ? Number(m[1]) : null;
}
