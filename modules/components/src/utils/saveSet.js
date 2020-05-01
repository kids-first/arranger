import { graphql } from './api';

export default ({
  type,
  path,
  userId,
  sqon = {},
  returnIds = false,
  api,
  sort = [],
  tag = '',
}) =>
  (api || graphql)({
    query: `
      mutation saveSet($type: String! $userId: String $sqon: JSON! $path: String!, $sort: [Sort], $tag: String) {
        saveSet(type: $type, userId: $userId, sqon: $sqon, path: $path, sort: $sort, tag: $tag) {
          setId
          createdAt
          path
          size
          sqon
          type
          userId
          ${returnIds ? `ids` : ``}
        }
      }
    `,
    variables: { sqon, type, userId, path, sort, tag },
  });
