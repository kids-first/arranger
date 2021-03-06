import { isFunction } from 'lodash';
import uuid from 'uuid/v4';
import { buildQuery, CONSTANTS } from '@kfarranger/middleware';
import {
  addSqonToSetSqon,
  makeUnique,
  removeSqonToSetSqon,
  retrieveIdsFromQuery,
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

const addOrRemoveIds = async ({
  types,
  postProcessCb,
  es,
  userId,
  setId,
  sqon,
  subAction,
  type,
  path,
}) => {
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
    return {
      updatedResults: 0,
    };
  }
  const sets = mapHits(esSearchResponse);
  const setToUpdate = sets[0];

  const { ids = [], tag, createdAt, sqon: sqonFromExistingSet } = setToUpdate;

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

  if (isFunction(postProcessCb)) {
    await postProcessCb({
      actionType: ActionTypes.UPDATE,
      subActionType: subAction,
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
};

const renameTag = async ({
  es,
  setId,
  newTag,
  subAction,
  userId,
  postProcessCb,
}) => {
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

  if (isFunction(postProcessCb)) {
    await postProcessCb({
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
};

export const updateSet = ({ types, postProcessCb }) => async (
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
          return {
            updatedResults: 0,
          };
        }

        const { setId } = target;

        return await addOrRemoveIds({
          es,
          types,
          postProcessCb,
          userId,
          setId,
          sqon,
          subAction,
          type,
          path,
        });
      } else {
        return {
          updatedResults: 0,
        };
      }
    }
    case SubActionTypes.RENAME_TAG: {
      const { setId } = target;
      const { newTag } = data;
      return await renameTag({
        es,
        postProcessCb,
        subAction,
        userId,
        setId,
        newTag,
      });
    }
    default:
      return {
        updatedResults: 0,
      };
  }
};

export const saveSet = ({ types, postProcessCb }) => async (
  obj,
  { type, userId, sqon, path, sort, refresh = 'WAIT_FOR', tag },
  { es },
) => {
  if (tag && !isFunction(postProcessCb)) {
    throw Error('Set post process function was not provided');
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
    await postProcessCb({ actionType: ActionTypes.CREATE, values: body });
  }
  return body;
};

export const deleteSets = ({ postProcessCb }) => async (
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

  if (isFunction(postProcessCb)) {
    await postProcessCb({
      actionType: ActionTypes.DELETE,
      values: {
        userId: userId,
        setIds: setIds,
      },
    });
  }

  return esResponse.deleted;
};
