import { toOptionalBoolean } from './to-optional-boolean';

describe('toOptionalBoolean', () => {
  describe('khi truyền giá trị trực tiếp', () => {
    it.each([
      ['true', true],
      ['false', false],
      [true, true],
      [false, false],
      ['', undefined],
      [undefined, undefined],
      [null, undefined],
      ['abc', 'abc'],
    ])('chuyển %p thành %p', (input, expected) => {
      expect(toOptionalBoolean(input)).toBe(expected);
    });
  });

  describe('khi truyền dạng params object ({ value }) từ class-transformer', () => {
    it.each([
      [{ value: 'true' }, true],
      [{ value: 'false' }, false],
      [{ value: true }, true],
      [{ value: false }, false],
      [{ value: '' }, undefined],
      [{ value: undefined }, undefined],
      [{ value: null }, undefined],
      [{ value: 'abc' }, 'abc'],
    ])('chuyển %p thành %p', (input, expected) => {
      expect(toOptionalBoolean(input)).toBe(expected);
    });
  });
});
