import { includesSqonSet } from '../utils';

describe('includesSqonSet', () => {
  it('should handle set sqon as array', () => {
    const sqon = {
      op: 'and',
      content: [
        {
          op: 'in',
          content: {
            field: 'kf_id',
            value: ['set_id:12345'],
          },
        },
        {
          op: 'in',
          content: {
            field: 'family.family_compositions.composition',
            value: ['trio'],
          },
        },
      ],
    };
    expect(includesSqonSet(sqon)).toBe(true);
  });

  it('should handle set sqon as string', () => {
    const sqon = {
      op: 'and',
      content: [
        {
          op: 'in',
          content: {
            field: 'kf_id',
            value: 'set_id:12345',
          },
        },
        {
          op: 'in',
          content: {
            field: 'family.family_compositions.composition',
            value: ['trio'],
          },
        },
      ],
    };
    expect(includesSqonSet(sqon)).toBe(true);
  });

  it('should handle sqon that is not a set', () => {
    const sqon = {
      op: 'and',
      content: [
        {
          op: 'in',
          content: {
            field: 'njfdhnsdjkfdn',
            value: 'some_other_value',
          },
        },
        {
          op: 'in',
          content: {
            field: 'family.family_compositions.composition',
            value: ['trio'],
          },
        },
      ],
    };
    expect(includesSqonSet(sqon)).toBe(false);
  });

  it('should handle null or undefined sqon', () => {
    const sqonUndef = undefined;
    expect(includesSqonSet(sqonUndef)).toBe(false);
    const sqonNull = null;
    expect(includesSqonSet(sqonNull)).toBe(false);
  });
});
