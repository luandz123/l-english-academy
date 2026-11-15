import {
  afterReview,
  checkExercise,
  enterSchedule,
  errorSegments,
  grammarTopicFor,
  levelForScore,
  levelHint,
  nearestAvailableLevel,
  normalizeFill,
  orderDueTopics,
  pickExercises,
  suggestedLevel,
  TOPIC,
  topicStatus,
  validateExercise,
  vnDate,
} from './grammar-rules';

describe('grammar-rules', () => {
  it('cấp theo điểm: <450 / 450–750 / >750', () => {
    expect(levelForScore(445)).toBe('basic');
    expect(levelForScore(450)).toBe('intermediate');
    expect(levelForScore(750)).toBe('intermediate');
    expect(levelForScore(755)).toBe('advanced');
  });

  it('cấp gợi ý: tự chọn dùng tới khi có điểm ước lượng mới hơn', () => {
    const manual = {
      level: 'advanced' as const,
      setAt: new Date('2026-11-05'),
    };
    expect(
      suggestedLevel({
        estimate: { total: 560, date: '2026-11-02' },
        manual,
        roadmapScore: null,
      }).level,
    ).toBe('advanced');
    const s = suggestedLevel({
      estimate: { total: 560, date: '2026-11-10' },
      manual,
      roadmapScore: 300,
    });
    expect([s.level, s.source, s.score]).toEqual([
      'intermediate',
      'estimate',
      560,
    ]);
    expect(
      suggestedLevel({ estimate: null, manual: null, roadmapScore: 800 }).level,
    ).toBe('advanced');
    expect(
      suggestedLevel({ estimate: null, manual: null, roadmapScore: null }),
    ).toMatchObject({ level: 'basic', source: 'default' });
  });

  it('cấp có câu gần nhất', () => {
    expect(nearestAvailableLevel('advanced', ['basic', 'intermediate'])).toBe(
      'intermediate',
    );
    expect(nearestAvailableLevel('basic', ['advanced'])).toBe('advanced');
    expect(nearestAvailableLevel('basic', [])).toBeNull();
  });

  it('trạng thái chủ điểm và giảm từ Thành thạo về Đã học', () => {
    const base = {
      opened: false,
      answeredAny: false,
      lessonDone: false,
      hasExercises: true,
      passedExercise: false,
      hasToeic: true,
      recentToeic: [] as boolean[],
    };
    expect(topicStatus(base)).toBe('not_started');
    expect(topicStatus({ ...base, opened: true })).toBe('learning');
    expect(topicStatus({ ...base, lessonDone: true })).toBe('learning');
    const learned = { ...base, lessonDone: true, passedExercise: true };
    expect(topicStatus(learned)).toBe('learned');
    const good = Array.from({ length: 10 }, (_, i) => i > 1);
    expect(topicStatus({ ...learned, recentToeic: good })).toBe('mastered');
    const bad = Array.from({ length: 10 }, (_, i) => i > 2);
    expect(topicStatus({ ...learned, recentToeic: bad })).toBe('learned');
    // chủ điểm chưa có bài tập: bỏ điều kiện bài tập
    expect(
      topicStatus({ ...base, lessonDone: true, hasExercises: false }),
    ).toBe('learned');
    // không có câu TOEIC: tối đa Đã học
    expect(
      topicStatus({ ...learned, hasToeic: false, recentToeic: good }),
    ).toBe('learned');
  });

  it('chấm điền từ bỏ hoa/thường và khoảng trắng; tìm lỗi sai đúng 4 phần', () => {
    expect(normalizeFill('  Has   Been  ')).toBe('has been');
    const fill = {
      kind: 'fill' as const,
      answerIndex: null,
      acceptedAnswers: ['has been', "hasn't been"],
    };
    expect(checkExercise(fill, { text: 'HAS  been.' })).toBe(true);
    expect(checkExercise(fill, { text: 'hasn’t been' })).toBe(true);
    expect(checkExercise(fill, { text: '' })).toBe(false);
    const choice = {
      kind: 'choice' as const,
      answerIndex: 2,
      acceptedAnswers: [],
    };
    expect(checkExercise(choice, { choice: 2 })).toBe(true);
    expect(checkExercise(choice, { choice: null })).toBe(false);
    expect(
      errorSegments('The [[report]] [[were]] [[sent]] [[yesterday]].'),
    ).toEqual(['report', 'were', 'sent', 'yesterday']);
    expect(
      validateExercise({
        kind: 'error',
        prompt: '[[a]] [[b]] c',
        options: [],
        answerIndex: 0,
        acceptedAnswers: [],
      }),
    ).toMatch(/4 phần/);
    expect(
      validateExercise({
        kind: 'fill',
        prompt: 'She ___ (go).',
        options: [],
        answerIndex: null,
        acceptedAnswers: ['goes'],
      }),
    ).toBeNull();
  });

  it('chọn câu: câu mới trước, thiếu thì bù câu từng sai', () => {
    const pool = [
      { id: 1, seen: true, wrong: false },
      { id: 2, seen: true, wrong: true },
      { id: 3, seen: false, wrong: false },
    ];
    const r = pickExercises(pool, 2, () => 0.5);
    expect(r.ids).toEqual([3, 2]);
    expect(r.exhausted).toBe(true);
    expect(pickExercises(pool, 1, () => 0.5).exhausted).toBe(false);
  });

  it('gợi ý lên/xuống cấp', () => {
    expect(levelHint('basic', 90, 80)).toEqual({
      type: 'up',
      to: 'intermediate',
    });
    expect(levelHint('basic', 90, 70)).toBeNull();
    expect(levelHint('basic', 90, null)).toBeNull();
    expect(levelHint('advanced', 100, 100)).toBeNull();
    expect(levelHint('intermediate', 40, null)).toEqual({
      type: 'down',
      to: 'basic',
    });
    expect(levelHint('basic', 40, null)).toEqual({ type: 'down', to: null });
  });

  it('lịch ôn 1→3→7→14→30, giữ nấc, về 1 ngày, rời lịch, ôn thêm', () => {
    const today = '2026-11-14';
    const s0 = enterSchedule(
      { step: null, due: null, goodStreak: 0, graduated: false },
      true,
      today,
    )!;
    expect(s0).toMatchObject({ step: 0, due: '2026-11-15' });
    expect(enterSchedule(s0, true, today)).toBeNull();
    const s1 = afterReview(s0, 80, false, today, false);
    expect(s1).toMatchObject({ step: 1, due: '2026-11-17', goodStreak: 1 });
    const s2 = afterReview(s1, 60, false, today, false);
    expect(s2).toMatchObject({ step: 1, due: '2026-11-17', goodStreak: 0 });
    const s3 = afterReview({ ...s2, step: 4 }, 100, false, today, false);
    expect(s3).toMatchObject({ step: 4, due: '2026-12-14' });
    expect(afterReview(s2, 40, false, today, false)).toMatchObject({
      step: 0,
      due: '2026-11-15',
    });
    const g = afterReview({ ...s1, goodStreak: 1 }, 100, true, today, false);
    expect(g).toMatchObject({ graduated: true, step: null, due: null });
    expect(enterSchedule(g, true, today)).toMatchObject({
      step: 0,
      due: '2026-11-15',
    });
    // ôn thêm: không đổi lịch trừ khi < 60%
    expect(afterReview(s1, 100, false, today, true)).toBe(s1);
    expect(afterReview(s1, 20, false, today, true)).toMatchObject({ step: 0 });
  });

  it('thứ tự chủ điểm đến hạn và ngày giờ Việt Nam', () => {
    const o = orderDueTopics([
      { id: 1, due: '2026-11-10', open: 1 },
      { id: 2, due: '2026-11-08', open: 1 },
      { id: 3, due: '2026-11-10', open: 5 },
    ]);
    expect(o.map((x) => x.id)).toEqual([2, 3, 1]);
    expect(vnDate(new Date('2026-11-13T18:00:00Z'))).toBe('2026-11-14');
  });

  it('gắn chủ điểm câu TOEIC từ nhãn dạng câu và lựa chọn', () => {
    expect(
      grammarTopicFor('vocabulary', ['a', 'b', 'c', 'd'], null),
    ).toBeNull();
    expect(grammarTopicFor(null, [], null)).toBeNull();
    expect(grammarTopicFor('sentence_insertion', [], null)).toBe(
      TOPIC.cohesion,
    );
    expect(
      grammarTopicFor('pronoun', ['he', 'him', 'his', 'himself'], null),
    ).toBe(TOPIC.pronouns);
    expect(
      grammarTopicFor('pronoun', ['who', 'whom', 'whose', 'which'], null),
    ).toBe(TOPIC.relative);
    expect(
      grammarTopicFor(
        'prep_conj',
        ['during', 'while', 'within', 'among'],
        null,
      ),
    ).toBe(TOPIC.prepositions);
    expect(
      grammarTopicFor(
        'prep_conj',
        ['although', 'despite', 'however', 'because'],
        null,
      ),
    ).toBe(TOPIC.conjunctions);
    expect(
      grammarTopicFor('prep_conj', ['whether', 'what', 'that', 'which'], null),
    ).toBe(TOPIC.relative);
    expect(
      grammarTopicFor('prep_conj', ['whether', 'what', 'because', 'so'], null),
    ).toBe(TOPIC.nounClause);
    expect(
      grammarTopicFor(
        'verb_tense',
        ['is reviewed', 'reviews', 'reviewing', 'to review'],
        'The report ___ every month.',
      ),
    ).toBe(TOPIC.gerundInf);
    expect(
      grammarTopicFor(
        'verb_tense',
        ['was approved', 'approved', 'approving', 'approves'],
        'The budget ___ yesterday.',
      ),
    ).toBe(TOPIC.passive);
    expect(
      grammarTopicFor(
        'verb_tense',
        ['has worked', 'have worked', 'works', 'working'],
        'She ___ here since 2019.',
      ),
    ).toBe(TOPIC.perfect);
    expect(
      grammarTopicFor(
        'verb_tense',
        ['is', 'are', 'be', 'being'],
        'The list of items ___ ready.',
      ),
    ).toBe(TOPIC.agreement);
    expect(
      grammarTopicFor(
        'verb_tense',
        ['submit', 'submits', 'submitted', 'submitting'],
        'The manager requested that each employee ___ a report.',
      ),
    ).toBe(TOPIC.subjunctive);
    expect(
      grammarTopicFor(
        'verb_tense',
        ['would attend', 'attends', 'attending', 'attend'],
        'If the meeting were rescheduled, she ___.',
      ),
    ).toBe(TOPIC.conditional);
    expect(
      grammarTopicFor(
        'verb_tense',
        ['go', 'went', 'goes', 'going'],
        'He ___ to work yesterday.',
      ),
    ).toBe(TOPIC.basicTenses);
    expect(
      grammarTopicFor(
        'word_form',
        ['more efficient', 'most efficient', 'efficiently', 'efficiency'],
        null,
      ),
    ).toBe(TOPIC.comparison);
    expect(
      grammarTopicFor(
        'word_form',
        ['interesting', 'interested', 'interest', 'interests'],
        null,
      ),
    ).toBe(TOPIC.participle);
    expect(
      grammarTopicFor(
        'word_form',
        ['success', 'successful', 'successfully', 'succeed'],
        null,
      ),
    ).toBe(TOPIC.wordForm);
  });
});
