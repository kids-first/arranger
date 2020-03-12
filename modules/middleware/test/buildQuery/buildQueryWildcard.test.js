import buildQuery from '../../src/buildQuery';

const nestedFields = ['files', 'files.foo'];


test('buildQuery wildcard nested with regexp', () => {
  const input = {
    nestedFields,
    filters: { content: { field: 'case_id', value: ['regexp:006.*'] }, op: 'in' },
  };
  const output = { regexp: { case_id: '006.*' } };

  const actualOutput = buildQuery(input);
  expect(actualOutput).toEqual(output);
});

test('buildQuery wildcard nested', () => {
  const input = {
    nestedFields,
    filters: { content: { field: 'case_id', value: ['006'] }, op: 'in' },
  };
  const output = { terms: { 'boost': 0, case_id: ['006'] } };

  const actualOutput = buildQuery(input);
  expect(actualOutput).toEqual(output);
});

test('buildQuery wildcard nested with one regexp and one ordinary value', () => {
  const input = {
    nestedFields,
    filters: {
      content: { field: 'case_id', value: ['regexp:006*', 'v1'] },
      op: 'in',
    },
  };
  const output = {
    bool: {
      should: [
        { terms: { case_id: ['v1'], boost: 0 } },
        { regexp: { case_id: '006*' } },
      ],
    },
  };

  const actualOutput = buildQuery(input);
  expect(actualOutput).toEqual(output);
});

test('buildQuery wildcard nested with one regexp and one ordinary value (op=and)', () => {
  const input = {
    nestedFields,
    filters: {
      content: [
        { content: { field: 'case_id', value: ['regexp:006*', 'v1'] }, op: 'in' },
      ],
      op: 'and',
    },
  };
  const output = {
    bool: {
      must: [
        {
          bool: {
            should: [
              { terms: { case_id: ['v1'], boost: 0 } },
              { regexp: { case_id: '006*' } },
            ],
          },
        },
      ],
    },
  };

  const actualOutput = buildQuery(input);
  expect(actualOutput).toEqual(output);
});

test('buildQuery wildcard nested with multiple contents with one containing a regex', () => {
  const input = {
    nestedFields,
    filters: {
      content: [
        { content: { field: 'case_id', value: ['regexp:006*', 'v1'] }, op: 'in' },
        {
          content: { field: 'project.primary_site', value: ['Brain'] },
          op: 'in',
        },
      ],
      op: 'and',
    },
  };
  const output = {
    bool: {
      must: [
        {
          bool: {
            should: [
              { terms: { case_id: ['v1'], boost: 0 } },
              { regexp: { case_id: '006*' } },
            ],
          },
        },
        { terms: { 'project.primary_site': ['Brain'], boost: 0 } },
      ],
    },
  };

  const actualOutput = buildQuery(input);
  expect(actualOutput).toEqual(output);
});


test('buildQuery wildcard nested (op "=")', () => {
  const input = {
    nestedFields,
    filters: {
      content: [
        { content: { field: 'files.foo.name', value: 'regexp:cname*' }, op: '=' },
      ],
      op: 'and',
    },
  };
  const output = {
    bool: {
      must: [
        {
          nested: {
            path: 'files',
            query: {
              bool: {
                must: [
                  {
                    nested: {
                      path: 'files.foo',
                      query: {
                        bool: {
                          must: [
                            { regexp: { 'files.foo.name': 'cname*' } },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  };

  const actualOutput = buildQuery(input);
  expect(actualOutput).toEqual(output);
});

test('buildQuery wildcard nested multiple regex', () => {
  const input = {
    nestedFields,
    filters: {
      content: [
        {
          content: {
            field: 'files.foo.name',
            value: ['regexp:*cname', 'regexp:cn*me', 'regexp:cname*'],
          },
          op: 'in',
        },
      ],
      op: 'and',
    },
  };
  const output = {
    bool: {
      must: [
        {
          bool: {
            should: [
              {
                nested: {
                  path: 'files',
                  query: {
                    bool: {
                      must: [
                        {
                          nested: {
                            path: 'files.foo',
                            query: {
                              bool: {
                                must: [
                                  {
                                    regexp: { 'files.foo.name': '*cname' },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
              {
                nested: {
                  path: 'files',
                  query: {
                    bool: {
                      must: [
                        {
                          nested: {
                            path: 'files.foo',
                            query: {
                              bool: {
                                must: [
                                  {
                                    regexp: { 'files.foo.name': 'cn*me' },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
              {
                nested: {
                  path: 'files',
                  query: {
                    bool: {
                      must: [
                        {
                          nested: {
                            path: 'files.foo',
                            query: {
                              bool: {
                                must: [
                                  {
                                    regexp: { 'files.foo.name': 'cname*' },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  };

  const actualOutput = buildQuery(input);
  expect(actualOutput).toEqual(output);
});


test('buildQuery wildcard nested multiple regex and multiple contents', () => {
  const input = {
    nestedFields,
    filters: {
      content: [
        { content: { field: 'files.foo.name1', value: 'regexp:*cname' }, op: '=' },
        { content: { field: 'files.foo.name2', value: 'regexp:cn*me' }, op: '=' },
        { content: { field: 'files.foo.name3', value: 'regexp:cname*' }, op: '=' },
      ],
      op: 'and',
    },
  };
  const output = {
    bool: {
      must: [
        {
          nested: {
            path: 'files',
            query: {
              bool: {
                must: [
                  {
                    nested: {
                      path: 'files.foo',
                      query: {
                        bool: {
                          must: [
                            { regexp: { 'files.foo.name1': '*cname' } },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        {
          nested: {
            path: 'files',
            query: {
              bool: {
                must: [
                  {
                    nested: {
                      path: 'files.foo',
                      query: {
                        bool: {
                          must: [
                            { regexp: { 'files.foo.name2': 'cn*me' } },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        {
          nested: {
            path: 'files',
            query: {
              bool: {
                must: [
                  {
                    nested: {
                      path: 'files.foo',
                      query: {
                        bool: {
                          must: [
                            { regexp: { 'files.foo.name3': 'cname*' } },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  };

  const actualOutput = buildQuery(input);
  expect(actualOutput).toEqual(output);
});




