import buildQuery from '../../src/buildQuery';
import {
  ES_ARRANGER_SET_INDEX,
  ES_ARRANGER_SET_TYPE,
} from '../../src/constants';

const nestedFields = ['files', 'files.foo'];

test('buildQuery sets when no nested field', () => {
  const actualOutput = buildQuery({
    nestedFields,
    filters: {
      content: { field: 'case_id', value: ['set_id:aaa'] },
      op: 'in',
    },
  });
  expect(actualOutput).toEqual([
    {
      terms: {
        case_id: {
          index: ES_ARRANGER_SET_INDEX,
          type: ES_ARRANGER_SET_TYPE,
          id: 'aaa',
          path: 'ids',
        },
        boost: 0,
      },
    },
  ]);
});

test('buildQuery sets when no nested field but value is a string', () => {
  const actualOutput = buildQuery({
    nestedFields,
    filters: {
      content: { field: 'case_id', value: 'set_id:aaa' },
      op: 'in',
    },
  });
  expect(actualOutput).toEqual([
    {
      terms: {
        case_id: {
          index: ES_ARRANGER_SET_INDEX,
          type: ES_ARRANGER_SET_TYPE,
          id: 'aaa',
          path: 'ids',
        },
        boost: 0,
      },
    },
  ]);
});

test('buildQuery sets when multiple set ids not-in', () => {
  const actualOutput = buildQuery({
    nestedFields,
    filters: {
      content: {
        field: 'case_id',
        value: ['set_id:aaa', 'set_id:bbb', 'set_id:ccc'],
      },
      op: 'not-in',
    },
  });
  expect(actualOutput).toEqual({
    bool: {
      must_not: [
        {
          terms: {
            boost: 0,
            case_id: {
              id: 'aaa',
              index: 'arranger-sets',
              path: 'ids',
              type: 'arranger-sets',
            },
          },
        },
        {
          terms: {
            boost: 0,
            case_id: {
              id: 'bbb',
              index: 'arranger-sets',
              path: 'ids',
              type: 'arranger-sets',
            },
          },
        },
        {
          terms: {
            boost: 0,
            case_id: {
              id: 'ccc',
              index: 'arranger-sets',
              path: 'ids',
              type: 'arranger-sets',
            },
          },
        },
      ],
    },
  });
});

test('buildQuery sets when multiple set ids in', () => {
  const actualOutput = buildQuery({
    nestedFields,
    filters: {
      content: {
        field: 'case_id',
        value: ['set_id:aaa', 'set_id:bbb', 'set_id:ccc'],
      },
      op: 'in',
    },
  });
  expect(actualOutput).toEqual([
    {
      terms: {
        boost: 0,
        case_id: {
          id: 'aaa',
          index: 'arranger-sets',
          path: 'ids',
          type: 'arranger-sets',
        },
      },
    },
    {
      terms: {
        boost: 0,
        case_id: {
          id: 'bbb',
          index: 'arranger-sets',
          path: 'ids',
          type: 'arranger-sets',
        },
      },
    },
    {
      terms: {
        boost: 0,
        case_id: {
          id: 'ccc',
          index: 'arranger-sets',
          path: 'ids',
          type: 'arranger-sets',
        },
      },
    },
  ]);
});

test('buildQuery sets when nested field', () => {
  const actualOutput = buildQuery({
    nestedFields,
    filters: {
      content: { field: 'ssms.ssm_id', value: ['set_id:aaa'] },
      op: 'in',
    },
  });
  expect(actualOutput).toEqual([
    {
      terms: {
        'ssms.ssm_id': {
          index: ES_ARRANGER_SET_INDEX,
          type: ES_ARRANGER_SET_TYPE,
          id: 'aaa',
          path: 'ids',
        },
        boost: 0,
      },
    },
  ]);
});

test('buildQuery sets when targeting files', () => {
  const actualOutput = buildQuery({
    nestedFields,
    filters: {
      content: { field: 'files.file_id', value: ['set_id:aaa'] },
      op: 'in',
    },
  });
  expect(actualOutput).toEqual({
    nested: {
      path: 'files',
      query: {
        bool: {
          must: [
            {
              terms: {
                'files.file_id': {
                  index: ES_ARRANGER_SET_INDEX,
                  type: ES_ARRANGER_SET_TYPE,
                  id: 'aaa',
                  path: 'ids',
                },
                boost: 0,
              },
            },
          ],
        },
      },
    },
  });
});
