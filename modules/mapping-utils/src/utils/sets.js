import { get, isEmpty } from 'lodash';

const REGEX_FOR_TAG = /^[a-zA-Z0-9-_ ]*$/;

export const MAX_LENGTH_TAG = 50;

export const isTagValid = rawTag => {
  const tag = (rawTag || '').trim();
  return !!tag && tag.length <= MAX_LENGTH_TAG && REGEX_FOR_TAG.test(tag);
};

export const addSqonToSetSqon = (receivingSqon, donorSqon, op = 'or') => {
  // Fixme incomplete
  const receivingContent = receivingSqon?.content || [];
  const donorContent = donorSqon?.content || [];
  return {
    op,
    content: [...receivingContent, ...donorContent],
  };
};

export const removeSqonToSetSqon = (setSqon, sqonToRemove) => {
  // Fixme incomplete
  const setSqonContent = setSqon?.content || [];
  const sqonToRemoveContent = sqonToRemove?.content || [];
  const negatedContent = sqonToRemoveContent.map(filter => ({
    op: 'not-in',
    content: filter.content,
  }));
  return {
    op: 'and',
    content: [...setSqonContent, ...negatedContent],
  };
};

export const makeUnique = ids => [...new Set(ids)];

const MAX_NUMBER_OF_IDS = 20000;

export const truncateIds = ids => (ids || []).slice(0, MAX_NUMBER_OF_IDS);

const handleResult = async ({ search, searchAfter, total, ids = [] }) => {
  if (ids.length === total) return makeUnique(ids);
  const { ids: newIds, ...response } = await search({ searchAfter });
  return handleResult({ ...response, ids: [...ids, ...newIds] });
};

export const retrieveIdsFromQuery = async ({
  es,
  index,
  type,
  query,
  path,
  sort,
  BULK_SIZE = 1000,
}) => {
  const search = async ({ searchAfter } = {}) => {
    const body = {
      ...(!isEmpty(query) && { query }),
      ...(searchAfter && { search_after: searchAfter }),
    };

    const response = await es.search({
      index,
      type,
      sort: sort.map(({ field, order }) => `${field}:${order || 'asc'}`),
      size: BULK_SIZE,
      body,
    });
    const ids = response.hits.hits.map(x =>
      get(x, `_source.${path.split('__').join('.')}`, x._id || ''),
    );

    const nextSearchAfter = sort
      .map(({ field }) =>
        response.hits.hits.map(x => x._source[field] || x[field]),
      )
      .reduce((acc, vals) => [...acc, ...vals.slice(-1)], []);

    return {
      ids,
      searchAfter: nextSearchAfter,
      total: response.hits.total,
      search,
    };
  };

  return handleResult(await search());
};
