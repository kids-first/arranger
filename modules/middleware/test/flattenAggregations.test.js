import flattenAggregations from '../src/flattenAggregations.js';

test('flattenAggregations (status)', () => {
  const input = {
    'status:global': {
      'status:filtered': {
        status: {
          buckets: [{ key: 'legacy', doc_count: 34 }],
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
        },
      },
    },
  };
  const output = { status: { buckets: [{ key: 'legacy', doc_count: 34 }] } };
  const actualOutput = flattenAggregations({ aggregations: input });
  expect(actualOutput).toEqual(output);
});

test('flattenAggregations (itemType)', () => {
  const input = {
    'itemType:global': {
      'itemType:filtered': {
        'itemType:missing': { doc_count: 0 },
        itemType: {
          buckets: [
            { key: 'Aliquot', doc_count: 16730 },
            { key: 'Portion', doc_count: 8 },
          ],
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
        },
      },
    },
    'categoryName:global': {
      'categoryName:filtered': {
        'categoryName:missing': { doc_count: 0 },
        categoryName: {
          buckets: [
            { key: 'Item flagged DN', doc_count: 16191 },
            { key: 'Item is noncanonical', doc_count: 2923 },
            { key: 'Sample compromised', doc_count: 2 },
            { key: 'WGA Failure', doc_count: 1 },
          ],
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
        },
      },
    },
  };
  const output = {
    categoryName: {
      buckets: [
        { key: 'Item flagged DN', doc_count: 16191 },
        { key: 'Item is noncanonical', doc_count: 2923 },
        { key: 'Sample compromised', doc_count: 2 },
        { key: 'WGA Failure', doc_count: 1 },
      ],
    },
    itemType: {
      buckets: [
        { key: 'Aliquot', doc_count: 16730 },
        { key: 'Portion', doc_count: 8 },
      ],
    },
  };
  const actualOutput = flattenAggregations({ aggregations: input });
  expect(actualOutput).toEqual(output);
});

test('flattenAggregations (status + status:missing)', () => {
  const input = {
    'status:global': {
      'status:filtered': {
        status: {
          buckets: [{ key: 'legacy', doc_count: 34 }],
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
        },
        'status:missing': { doc_count: 1 },
      },
    },
  };
  const output = {
    status: {
      buckets: [
        { key: 'legacy', doc_count: 34 },
        { key: '__missing__', doc_count: 1 },
      ],
    },
  };
  const actualOutput = flattenAggregations({ aggregations: input });
  expect(actualOutput).toEqual(output);
});

test('flattenAggregations (archive)', () => {
  const input = {
    'archive.revision:global': {
      'archive.revision:filtered': {
        'status:missing': { doc_count: 0 },
        'archive.revision': {
          buckets: [
            { key: 2002, doc_count: 37860 },
            { key: 0, doc_count: 36684 },
          ],
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
        },
      },
    },
  };
  const output = {
    'archive.revision': {
      buckets: [
        { key: 2002, doc_count: 37860 },
        { key: 0, doc_count: 36684 },
      ],
    },
  };
  const actualOutput = flattenAggregations({ aggregations: input });
  expect(actualOutput).toEqual(output);
});

test('flattenAggregations (samples)', () => {
  const input = {
    'samples.is_ffpe:global': {
      'samples.is_ffpe:filtered': {
        'samples.is_ffpe:nested': {
          'samples.is_ffpe:missing': {
            rn: { doc_count: 5 },
            doc_count: 3,
          },
          'samples.is_ffpe': {
            buckets: [{ rn: { doc_count: 7 }, key: 'a', doc_count: 7 }],
          },
          doc_count: 123,
        },
        doc_count: 132,
      },
      doc_count: 1234,
    },
  };
  const output = {
    'samples.is_ffpe': {
      buckets: [
        { key: 'a', doc_count: 7 },
        { key: '__missing__', doc_count: 5 },
      ],
    },
  };
  const actualOutput = flattenAggregations({ aggregations: input });
  expect(actualOutput).toEqual(output);
});

test('flattenAggregations (sample + missing)', () => {
  const input = {
    'samples.portions.amount:global': {
      'samples.portions.amount:filtered': {
        samples: {
          portions: {
            'samples.portions.amount': {
              buckets: [{ rn: { doc_count: 7 }, key: 'a', doc_count: 7 }],
            },
            'samples.portions.amount:missing': {
              rn: { doc_count: 5 },
              doc_count: 3,
            },
            doc_count: 123,
          },
          doc_count: 123,
        },
        doc_count: 132,
      },
      doc_count: 1234,
    },
  };
  const output = {
    'samples.portions.amount': {
      buckets: [
        { key: 'a', doc_count: 7 },
        { key: '__missing__', doc_count: 5 },
      ],
    },
  };
  const actualOutput = flattenAggregations({ aggregations: input });
  expect(actualOutput).toEqual(output);
});

test('flattenAggregations (samples + ffpe)', () => {
  const input = {
    'samples.portions.amount:global': {
      'samples.portions.amount:filtered': {
        samples: {
          portions: {
            'samples.portions.amount': {
              buckets: [{ rn: { doc_count: 7 }, key: 'a', doc_count: 7 }],
            },
            'samples.portions.amount:missing': {
              rn: { doc_count: 5 },
              doc_count: 3,
            },
            doc_count: 123,
          },
          'samples.is_ffpe:missing': {
            rn: { doc_count: 5 },
            doc_count: 3,
          },
          'samples.is_ffpe': {
            buckets: [{ rn: { doc_count: 7 }, key: 'a', doc_count: 7 }],
          },
          doc_count: 123,
        },
        doc_count: 132,
      },
      doc_count: 1234,
    },
  };
  const output = {
    'samples.portions.amount': {
      buckets: [
        { key: 'a', doc_count: 7 },
        { key: '__missing__', doc_count: 5 },
      ],
    },
    'samples.is_ffpe': {
      buckets: [
        { key: 'a', doc_count: 7 },
        { key: '__missing__', doc_count: 5 },
      ],
    },
  };
  const actualOutput = flattenAggregations({ aggregations: input });
  expect(actualOutput).toEqual(output);
});

test('flattenAggregations (status + ffpe)', () => {
  const input = {
    'status:global': {
      'status:filtered': {
        status: {
          buckets: [{ key: 'legacy', doc_count: 34 }],
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
        },
        'status:missing': { doc_count: 0 },
      },
    },
    'samples.portions.amount_global': {
      'samples.portions.amount:filtered': {
        samples: {
          'samples.is_ffpe:missing': {
            rn: { doc_count: 5 },
            doc_count: 3,
          },
          portions: {
            'samples.portions.amount': {
              buckets: [{ rn: { doc_count: 7 }, key: 'a', doc_count: 7 }],
            },
            'samples.portions.amount:missing': {
              rn: { doc_count: 5 },
              doc_count: 3,
            },
            doc_count: 123,
          },
          'samples.is_ffpe': {
            buckets: [{ rn: { doc_count: 7 }, key: 'a', doc_count: 7 }],
          },
          doc_count: 123,
        },
        doc_count: 132,
      },
      doc_count: 1234,
    },
  };
  const output = {
    status: { buckets: [{ key: 'legacy', doc_count: 34 }] },
    'samples.portions.amount': {
      buckets: [
        { key: 'a', doc_count: 7 },
        { key: '__missing__', doc_count: 5 },
      ],
    },
    'samples.is_ffpe': {
      buckets: [
        { key: 'a', doc_count: 7 },
        { key: '__missing__', doc_count: 5 },
      ],
    },
  };
  const actualOutput = flattenAggregations({ aggregations: input });
  expect(actualOutput).toEqual(output);
});

test('flattenAggregations (cardinality)', () => {
  const input = {
    'files.kf_id:nested': {
      doc_count: 53254,
      'files.kf_id:cardinality': { value: 49095 },
    },
    'family_id:cardinality': { value: 3866 },
  };
  const output = {
    'files.kf_id': { cardinality: 49095 },
    family_id: { cardinality: 3866 },
  };
  const actualOutput = flattenAggregations({ aggregations: input });
  expect(actualOutput).toEqual(output);
});

test('flattenAggregations (top_hits)', () => {
  const input = {
    'observed_phenotype.name:nested': {
      doc_count: 55,
      'observed_phenotype.name:top_hits': {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'All (HP:0000001)',
            doc_count: 3,
            'observed_phenotype.name.hits': {
              hits: {
                total: 3,
                max_score: 1,
                hits: [
                  {
                    _index: 'participant_centric_sd_ynssaphe_re_ceg0c8wk',
                    _type: 'participant_centric',
                    _id: 'PT_29ZEF7YN',
                    _nested: {
                      field: 'observed_phenotype',
                      offset: 15,
                    },
                    _score: 1,
                    _source: {
                      parents: [],
                    },
                  },
                ],
              },
            },
          },
          {
            key: 'Phenotypic abnormality (HP:0000118)',
            doc_count: 3,
            'observed_phenotype.name.hits': {
              hits: {
                total: 3,
                max_score: 1,
                hits: [
                  {
                    _index: 'participant_centric_sd_ynssaphe_re_ceg0c8wk',
                    _type: 'participant_centric',
                    _id: 'PT_29ZEF7YN',
                    _nested: {
                      field: 'observed_phenotype',
                      offset: 12,
                    },
                    _score: 1,
                    _source: {
                      parents: ['All (HP:0000001)'],
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    },
  };
  const output = {
    'observed_phenotype.name': {
      top_hits: [
        { key: 'All (HP:0000001)', doc_count: 3, hits: { parents: [] } },
        {
          key: 'Phenotypic abnormality (HP:0000118)',
          doc_count: 3,
          hits: { parents: ['All (HP:0000001)'] },
        },
      ],
    },
  };
  const actualOutput = flattenAggregations({ aggregations: input });
  expect(actualOutput).toEqual(output);
});
