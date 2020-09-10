import { get, isEmpty, isFunction } from 'lodash';
import uuid from 'uuid/v4';
import { CONSTANTS, buildQuery } from '@kfarranger/middleware';
import {
  isTagValid,
  addSqonToSetSqon,
  removeSqonToSetSqon,
  makeUnique,
  truncateIds,
} from './utils/sets';
import mapHits from './utils/mapHits';

const isQueryEmpty = sqon => !sqon || sqon.content.length === 0;

const ActionTypes = {
  CREATE: 'CREATE',
  DELETE: 'DELETE',
  UPDATE: 'UPDATE',
};

const SubActionTypes = {
  RENAME_TAG: 'RENAME_TAG',
  ADD_IDS: 'ADD_IDS',
  REMOVE_IDS: 'REMOVE_IDS',
};

const SourceType = {
  QUERY: 'QUERY',
  SAVE_SET: 'SAVE_SET',
};

const handleResult = async ({ search, searchAfter, total, ids = [] }) => {
  if (ids.length === total) return makeUnique(ids);
  const { ids: newIds, ...response } = await search({ searchAfter });
  return handleResult({ ...response, ids: [...ids, ...newIds] });
};

const retrieveIdsFromQuery = async ({
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

export const saveSet = ({ types, callback }) => async (
  obj,
  { type, userId, sqon, path, sort, refresh = 'WAIT_FOR', tag },
  { es },
) => {
  if (isQueryEmpty(sqon)) {
    throw new Error('Query must not be empty.');
  }

  if (tag) {
    // if a tag is present, test early.
    if (!isTagValid(tag)) {
      throw new Error('Invalid tag.');
    } else if (!isFunction(callback)) {
      throw new Error('Internal error.');
    }
  }
  const { nested_fields: nestedFields, es_type, index } = types.find(
    ([, x]) => x.name === type,
  )[1];

  const query = buildQuery({ nestedFields, filters: sqon || {} });

  const allIdsFromQuery = await retrieveIdsFromQuery({
    es,
    index: index,
    type: es_type,
    query,
    path,
    sort: sort && sort.length ? sort : [{ field: '_id', order: 'asc' }],
  });

  const truncatedIds = truncateIds(allIdsFromQuery);

  const body = {
    setId: uuid(),
    createdAt: Date.now(),
    ids: truncatedIds,
    type,
    path,
    sqon,
    userId,
    size: truncatedIds.length,
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
    await callback({ actionType: ActionTypes.CREATE, values: body });
  }
  return body;
};

export const deleteSets = ({ callback }) => async (
  obj,
  { setIds, userId },
  { es },
) => {
  const esResponse = await es.deleteByQuery({
    index: CONSTANTS.ES_ARRANGER_SET_INDEX,
    type: CONSTANTS.ES_ARRANGER_SET_TYPE,
    body: {
      query: {
        bool: {
          filter: {
            term: { userId: userId },
          },
          must: {
            terms: {
              setId: setIds,
            },
          },
        },
      },
    },
  });

  if (isFunction(callback)) {
    await callback({
      actionType: ActionTypes.DELETE,
      values: {
        userId: userId,
        setIds: setIds,
      },
    });
  }

  return esResponse.deleted;
};

export const updateSet = ({ types, callback }) => async (
  obj,
  { source, subAction, target, userId, data },
  { es },
) => {
  const { sourceType } = source;

  switch (subAction) {
    case SubActionTypes.REMOVE_IDS:
    case SubActionTypes.ADD_IDS: {
      if (SourceType.QUERY === sourceType) {
        const { type, sqon, path } = data;

        if (isQueryEmpty(sqon)) {
          throw new Error('Query must not be empty.');
        }

        const { setId } = target;

        const esSearchResponse = await es.search({
          index: CONSTANTS.ES_ARRANGER_SET_INDEX,
          type: CONSTANTS.ES_ARRANGER_SET_TYPE,
          body: {
            query: {
              bool: {
                filter: {
                  term: { userId: userId },
                },
                must: {
                  term: {
                    setId: {
                      value: setId,
                    },
                  },
                },
              },
            },
          },
        });

        const sets = mapHits(esSearchResponse);
        if (sets.length === 0) {
          throw new Error('Internal error.');
        }

        const { nested_fields: nestedFields, es_type, index } = types.find(
          ([, x]) => x.name === type,
        )[1];

        const query = buildQuery({ nestedFields, filters: sqon || {} });

        const idsFromQuery = await retrieveIdsFromQuery({
          es,
          index: index,
          type: es_type,
          query,
          path,
          sort: [{ field: '_id', order: 'asc' }],
        });

        if (idsFromQuery.length === 0) {
          return;
        }

        const setToUpdate = sets[0];

        const {
          ids = [],
          tag,
          createdAt,
          sqon: sqonFromExistingSet,
        } = setToUpdate;

        let updatedIds = [];
        let combinedSqon;
        if (SubActionTypes.ADD_IDS === subAction) {
          const concatenatedIds = [...ids, ...idsFromQuery];
          updatedIds = truncateIds(makeUnique(concatenatedIds));
          combinedSqon = addSqonToSetSqon(sqonFromExistingSet, sqon);
        } else if (SubActionTypes.REMOVE_IDS === subAction) {
          updatedIds = ids.filter(id => !idsFromQuery.includes(id));
          combinedSqon = removeSqonToSetSqon(sqonFromExistingSet, sqon);
        }

        const idsSize = updatedIds.length;

        const esUpdateResponse = await es.updateByQuery({
          index: CONSTANTS.ES_ARRANGER_SET_INDEX,
          type: CONSTANTS.ES_ARRANGER_SET_TYPE,
          refresh: true,
          body: {
            script: {
              lang: 'painless',
              source: `ctx._source.ids = params.updatedIds ; ctx._source.size = params.newSize; ctx._source.sqon = params.combinedSqon`,
              params: {
                updatedIds: updatedIds,
                newSize: idsSize,
                combinedSqon,
              },
            },
            query: {
              bool: {
                filter: {
                  term: { userId: userId },
                },
                must: {
                  term: {
                    setId: {
                      value: setId,
                    },
                  },
                },
              },
            },
          },
        });

        if (isFunction(callback)) {
          await callback({
            actionType: ActionTypes.UPDATE,
            subAction: subAction,
            values: {
              userId: userId,
              ids: updatedIds,
              setId,
              createdAt,
              tag,
            },
          });
        }

        return {
          setSize: idsSize,
          updatedResults: esUpdateResponse.updated,
        };
      } else {
        throw new Error('Internal error.');
      }
    }
    case SubActionTypes.RENAME_TAG: {
      const { setId } = target;
      const { newTag } = data;
      const esResponse = await es.updateByQuery({
        index: CONSTANTS.ES_ARRANGER_SET_INDEX,
        type: CONSTANTS.ES_ARRANGER_SET_TYPE,
        refresh: true,
        body: {
          script: {
            lang: 'painless',
            source: `ctx._source.tag = params.newTag`,
            params: {
              newTag,
            },
          },
          query: {
            bool: {
              filter: {
                term: { userId: userId },
              },
              must: {
                term: {
                  setId: {
                    value: setId,
                  },
                },
              },
            },
          },
        },
      });

      if (isFunction(callback)) {
        await callback({
          actionType: ActionTypes.UPDATE,
          subActionType: subAction,
          values: {
            userId: userId,
            setId: setId,
            newTag,
          },
        });
      }
      return {
        updatedResults: esResponse.updated,
      };
    }
    default:
      throw new Error('Unsupported action.');
  }
};
