import {
  generatePasscode,
  pickMatch,
  type MatchCandidate,
} from './speaking-rules';

const room = (over: Partial<MatchCandidate>): MatchCandidate => ({
  id: 'r',
  englishLevel: 'B1',
  topics: [],
  capacity: 4,
  memberCount: 1,
  createdAt: new Date('2026-11-03T10:00:00Z'),
  ...over,
});

describe('pickMatch', () => {
  it('bỏ phòng đầy, ưu tiên cùng trình độ rồi tới chủ đề trùng', () => {
    const best = pickMatch(
      'B1',
      ['Travel'],
      [
        room({ id: 'full', memberCount: 4 }),
        room({ id: 'other-level', englishLevel: 'C1', topics: ['Travel'] }),
        room({ id: 'same-level-no-topic' }),
        room({ id: 'same-level-topic', topics: ['Travel', 'Food'] }),
      ],
    );
    expect(best?.id).toBe('same-level-topic');
  });

  it('không cùng trình độ vẫn ghép (như RPC cũ), đông người được ưu tiên', () => {
    const best = pickMatch(
      'A1',
      [],
      [
        room({ id: 'a', englishLevel: 'B2', memberCount: 1 }),
        room({ id: 'b', englishLevel: 'C1', memberCount: 3 }),
      ],
    );
    expect(best?.id).toBe('b');
  });

  it('không có phòng → null', () => {
    expect(pickMatch('B1', [], [room({ memberCount: 4 })])).toBeNull();
  });
});

describe('generatePasscode', () => {
  it('6 ký tự, không có ký tự dễ nhầm', () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePasscode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});
