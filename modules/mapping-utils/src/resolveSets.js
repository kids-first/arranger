import { get, isEmpty, uniq, isFunction } from 'lodash';
import uuid from 'uuid/v4';
import { CONSTANTS, buildQuery } from '@kfarranger/middleware';
import { isTagValid } from './utils/sets';

const retrieveSetIds = async ({
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
    };
  };
  const handleResult = async ({ searchAfter, total, ids = [] }) => {
    if (ids.length === total) return uniq(ids);
    const { ids: newIds, ...response } = await search({ searchAfter });
    return handleResult({ ...response, ids: [...ids, ...newIds] });
  };
  return handleResult(await search());
};

export const saveSet = ({ types, callback }) => async (
  obj,
  { type, userId, sqon, path, sort, refresh = 'WAIT_FOR', tag },
  { es },
) => {
  if (tag) {
    // if a tag is present, test early.
    if (!isTagValid(tag)) {
      throw new Error('Invalid tag, no set created.');
    } else if (!isFunction(callback)) {
      throw new Error('Cannot process further, no set created.');
    }
  }
  const { nested_fields: nestedFields, es_type, index } = types.find(
    ([, x]) => x.name === type,
  )[1];
  const query = buildQuery({ nestedFields, filters: sqon || {} });

  const ids = await retrieveSetIds({
    es,
    index: index,
    type: es_type,
    query,
    path,
    sort: sort && sort.length ? sort : [{ field: '_id', order: 'asc' }],
  });

  const body = {
    setId: uuid(),
    createdAt: Date.now(),
    ids,
    type,
    path,
    sqon,
    userId,
    size: ids.length,
    tag,
  };

  await es.index({
    index: CONSTANTS.ES_ARRANGER_SET_INDEX,
    type: CONSTANTS.ES_ARRANGER_SET_TYPE,
    id: body.setId,
    refresh: refresh.toLowerCase(),
    body,
  });

  if (tag) {
    await callback(body);
  }
  return body;
};

export const deleteSaveSets = ({ callback }) => async (
  obj,
  { setIds, userId },
  { es },
) => {
  const esResponse = await es.deleteByQuery({
    index: CONSTANTS.ES_ARRANGER_SET_INDEX,
    type: CONSTANTS.ES_ARRANGER_SET_TYPE,
    body: {
      query: {
        terms: {
          setId: setIds,
        },
      },
    },
  });

  if (isFunction(callback)) {
    await callback({ userId: userId, setIds: setIds, toDelete: true });
  }

  return esResponse.deleted;
};
