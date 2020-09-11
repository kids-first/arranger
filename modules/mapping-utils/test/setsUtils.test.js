import { isTagValid, MAX_LENGTH_TAG } from '../src/utils/sets';

describe('validate tag', () => {
  it('should not allow special character %', () => {
    expect(isTagValid('mySave%Set')).toBe(false);
  });

  it('should not allow empty input', () => {
    expect(isTagValid('')).toBe(false);
  });

  it('should not allow blank input', () => {
    expect(isTagValid(' ')).toBe(false);
  });

  it('should allow blank or empty space(s)', () => {
    expect(isTagValid('mySave Set')).toBe(true);
  });

  it(`should not allow more than ${MAX_LENGTH_TAG} characters`, () => {
    expect(isTagValid('a'.repeat(MAX_LENGTH_TAG + 1))).toBe(false);
  });

  it(`should allow "-"`, () => {
    expect(isTagValid('my-set')).toBe(true);
  });

  it(`should allow "_"`, () => {
    expect(isTagValid('my_set')).toBe(true);
  });
});
