import {
  DEFAULT_VIP_PRICE,
  extractOrderCode,
  isPaidInFull,
  newOrderCode,
  vipPriceFromSetting,
} from './payment-rules';

describe('extractOrderCode (giữ mẫu của api/payment-webhook.ts)', () => {
  it.each([
    ['MBVCB.123 LEA12345 chuyen tien', 'LEA12345'],
    ['lea12345', 'LEA12345'],
    ['thanh toan VIPABC123', 'VIPABC123'],
    ['LEA 12345 ck', 'LEA12345'],
    ['ck 54321 nang cap', 'LEA54321'],
    ['khong co ma', null],
    ['', null],
  ])('%p → %p', (content, expected) => {
    expect(extractOrderCode(content)).toBe(expected);
  });
});

describe('vipPriceFromSetting', () => {
  it('đọc vip_combo.price từ JSON cài đặt', () => {
    expect(
      vipPriceFromSetting(JSON.stringify({ vip_combo: { price: 990000 } })),
    ).toBe(990000);
  });

  it.each([
    [null],
    [''],
    ['không phải json'],
    [JSON.stringify({})],
    [JSON.stringify({ vip_combo: { price: 0 } })],
    [JSON.stringify({ vip_combo: { price: -5 } })],
    [JSON.stringify({ vip_combo: { price: 'abc' } })],
  ])('%p → giá mặc định', (raw) => {
    expect(vipPriceFromSetting(raw)).toBe(DEFAULT_VIP_PRICE);
  });
});

describe('isPaidInFull (#23a)', () => {
  it('đủ hoặc dư tiền → true; thiếu, kể cả ≥ 5.000đ → false', () => {
    expect(isPaidInFull(1_750_000, 1_750_000)).toBe(true);
    expect(isPaidInFull(2_000_000, 1_750_000)).toBe(true);
    expect(isPaidInFull(5_000, 1_750_000)).toBe(false);
    expect(isPaidInFull(1_749_999, 1_750_000)).toBe(false);
    expect(isPaidInFull(Number.NaN, 1_750_000)).toBe(false);
  });
});

describe('newOrderCode', () => {
  it('dạng LEA + 5 chữ số', () => {
    expect(newOrderCode(() => 0)).toBe('LEA10000');
    expect(newOrderCode(() => 0.99999)).toBe('LEA99999');
    expect(newOrderCode()).toMatch(/^LEA\d{5}$/);
  });
});
