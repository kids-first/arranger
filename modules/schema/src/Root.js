import GraphQLJSON from 'graphql-type-json';
import { GraphQLDate } from 'graphql-scalars';
import uuid from 'uuid/v4';
import { startCase } from 'lodash';
import Parallel from 'paralleljs';

import {
  createConnectionResolvers,
  saveSet,
  deleteSaveSets,
  mappingToFields,
  renameSaveSetTag,
} from '@kfarranger/mapping-utils';

import { typeDefs as AggregationsTypeDefs } from './Aggregations';
import { typeDefs as SetTypeDefs } from './Sets';
import { typeDefs as SortTypeDefs } from './Sort';
import { typeDefs as DeleteSets } from './DeleteSets';
import { typeDefs as EditSets } from './DeleteSets';
import { typeDefs as StateTypeDefs } from './State';

let RootTypeDefs = ({ types, rootTypes, scalarTypes, enableAdmin }) => `
  scalar JSON
  scalar Date
  enum EsRefresh {
    TRUE
    FALSE
    WAIT_FOR
  }

  ${scalarTypes.map(([type]) => `scalar ${type}`)}

  interface Node {
    id: ID!
  }

  type FileSize {
    value: Float
  }

  type QueryResults {
    total: Int
    hits: [Node]
  }

  type Root {
    node(id: ID!): Node
    viewer: Root
    query(query: String, types: [String]): QueryResults

    ${rootTypes.map(([key]) => `${key}: ${startCase(key).replace(/\s/g, '')}`)}
    ${types.map(([key, type]) => `${type.name}: ${type.name}`)}
  }

  ${rootTypes.map(([, type]) => type.typeDefs)}

  type Mutation {
    ${
      enableAdmin
        ? `saveAggsState(graphqlField: String! state: JSON!): AggsState
    saveColumnsState(graphqlField: String! state: JSON!): ColumnsState
    saveMatchBoxState(graphqlField: String! state: JSON!): MatchBoxState
    saveSet(type: String! userId: String sqon: JSON! path: String! sort: [Sort] refresh: EsRefresh tag: String): Set
    deleteSaveSets(setIds: [String!] userId: String!): Int
    renameSaveSetTag(tag: String! userId: String!, setId: String!): String
    `
        : `
    saveSet(type: String! userId: String sqon: JSON! path: String! sort: [Sort] refresh: EsRefresh tag: String): Set
    deleteSaveSets(setIds: [String!] userId: String!): Int
    renameSaveSetTag(tag: String! userId: String!, setId: String!): String
    `
    }
  }

  schema {
    query: Root
    mutation: Mutation
  }
`;

export let typeDefs = ({ types, rootTypes, scalarTypes, enableAdmin }) => [
  RootTypeDefs({ types, rootTypes, scalarTypes, enableAdmin }),
  AggregationsTypeDefs,
  SetTypeDefs,
  SortTypeDefs,
  StateTypeDefs,
  DeleteSets,
  EditSets,
  ...types.map(([key, type]) => mappingToFields({ key, type, parent: '' })),
];

let resolveObject = () => ({});

export let resolvers = ({
  types,
  rootTypes,
  scalarTypes,
  enableAdmin,
  callbacks,
}) => {
  return {
    JSON: GraphQLJSON,
    Date: GraphQLDate,
    Root: {
      viewer: resolveObject,
      ...[...types, ...rootTypes].reduce(
        (acc, [key, type]) => ({
          ...acc,
          [type.name || key]: resolveObject,
        }),
        {},
      ),
    },
    ...types.reduce(
      (acc, [key, type]) => ({
        ...acc,
        ...createConnectionResolvers({
          type,
          createStateResolvers: 'createState' in type ? type.createState : true,
          Parallel,
        }),
      }),
      {},
    ),
    ...rootTypes.reduce(
      (acc, [key, type]) => ({
        ...acc,
        ...(type.resolvers
          ? { [startCase(key).replace(/\s/g, '')]: type.resolvers }
          : {}),
      }),
      {},
    ),
    ...scalarTypes.reduce(
      (acc, [scalar, resolver]) => ({
        ...acc,
        [scalar]: resolver,
      }),
      {},
    ),
    Mutation: {
      ...(() =>
        enableAdmin
          ? {
              saveAggsState: async (
                obj,
                { graphqlField, state },
                { es, projectId },
              ) => {
                // TODO: validate / make proper input type
                const type = types.find(
                  ([, type]) => type.name === graphqlField,
                )[1];
                await es.create({
                  index: `${type.indexPrefix}-aggs-state`,
                  type: `${type.indexPrefix}-aggs-state`,
                  id: uuid(),
                  body: {
                    timestamp: new Date().toISOString(),
                    state,
                  },
                  refresh: true,
                });

                let data = await es.search({
                  index: `${type.indexPrefix}-aggs-state`,
                  type: `${type.indexPrefix}-aggs-state`,
                  body: {
                    sort: [{ timestamp: { order: 'desc' } }],
                    size: 1,
                  },
                });
                return data.hits.hits[0]._source;
              },
              saveColumnsState: async (
                obj,
                { graphqlField, state },
                { es, projectId },
              ) => {
                // TODO: validate / make proper input type
                const type = types.find(
                  ([, type]) => type.name === graphqlField,
                )[1];
                await es.create({
                  index: `${type.indexPrefix}-columns-state`,
                  type: `${type.indexPrefix}-columns-state`,
                  id: uuid(),
                  body: {
                    timestamp: new Date().toISOString(),
                    state,
                  },
                  refresh: true,
                });

                let data = await es.search({
                  index: `${type.indexPrefix}-columns-state`,
                  type: `${type.indexPrefix}-columns-state`,
                  body: {
                    sort: [{ timestamp: { order: 'desc' } }],
                    size: 1,
                  },
                });

                return data.hits.hits[0]._source;
              },
              saveMatchBoxState: async (
                obj,
                { graphqlField, state },
                { es, projectId },
              ) => {
                // TODO: validate / make proper input type
                const type = types.find(
                  ([, type]) => type.name === graphqlField,
                )[1];
                await es.create({
                  index: `${type.indexPrefix}-matchbox-state`,
                  type: `${type.indexPrefix}-matchbox-state`,
                  id: uuid(),
                  body: {
                    timestamp: new Date().toISOString(),
                    state,
                  },
                  refresh: true,
                });

                let data = await es.search({
                  index: `${type.indexPrefix}-matchbox-state`,
                  type: `${type.indexPrefix}-matchbox-state`,
                  body: {
                    sort: [{ timestamp: { order: 'desc' } }],
                    size: 1,
                  },
                });

                return data.hits.hits[0]._source;
              },
            }
          : {})(),
      saveSet: saveSet({ types, callback: callbacks?.saveSet }),
      deleteSaveSets: deleteSaveSets({ callback: callbacks?.saveSet }),
      renameSaveSetTag: updateSaveSet({ callback: callbacks?.saveSet }),
    },
  };
};
