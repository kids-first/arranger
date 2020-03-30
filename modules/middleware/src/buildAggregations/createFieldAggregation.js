import get from 'lodash/get';
import { STATS, HISTOGRAM, BUCKETS, CARDINALITY, TOPHITS } from '../constants';
import dialog from 'eslint-plugin-jsx-a11y/lib/util/implicitRoles/dialog';

const MAX_AGGREGATION_SIZE = 300000;
const HISTOGRAM_INTERVAL_DEFAULT = 1000;
const CARDINALITY_DEFAULT_PRECISION_THRESHOLD = 40000; //max supported threshold by es 6.8

const createNumericAggregation = ({ type, field, graphqlField }) => {
  const args = get(graphqlField, [type, '__arguments', 0]) || {};
  return {
    [`${field}:${type}`]: {
      [type]: {
        field,
        ...(type === HISTOGRAM
          ? {
              interval:
                get(args, 'interval.value') || HISTOGRAM_INTERVAL_DEFAULT,
            }
          : {}),
      },
    },
  };
};

const createTermAggregation = ({ field, isNested }) => {
  return {
    [field]: {
      ...(isNested ? { aggs: { rn: { reverse_nested: {} } } } : {}),
      terms: { field, size: MAX_AGGREGATION_SIZE },
    },
    [`${field}:missing`]: {
      ...(isNested ? { aggs: { rn: { reverse_nested: {} } } } : {}),
      missing: { field: field },
    },
  };
};

const createTopHitsAggregation = ({ field, graphqlField }) => {
  const source = get(graphqlField, [TOPHITS, '__arguments', 0]) || [];
  const size = get(graphqlField, [TOPHITS, '__arguments', 1]) || [];

  return {
    [`${field}:${TOPHITS}`]: {
      terms: { field, size: MAX_AGGREGATION_SIZE },
      aggs: {
        [`${field}.hits`]: {
          top_hits: {
            _source: [source?._source?.value || ""], size: size?.size?.value
          }
        }
      },
    }
  };
};

const getPrecisionThreshold = graphqlField => {
  const args = get(graphqlField, [CARDINALITY, '__arguments', 0], {});
  return (
    args?.precision_threshold?.value || CARDINALITY_DEFAULT_PRECISION_THRESHOLD
  );
};

const computeCardinalityAggregation = ({ field, graphqlField }) => ({
  [`${field}:${CARDINALITY}`]: {
    cardinality: {
      field,
      precision_threshold: getPrecisionThreshold(graphqlField),
    },
  },
});

/**
 * graphqlFields: output from `graphql-fields` (https://github.com/robrichard/graphql-fields)
 */
export default ({
  field,
  graphqlField = {},
  isNested = false
}) => {
  const types = [BUCKETS, STATS, HISTOGRAM, CARDINALITY, TOPHITS].filter(
    t => graphqlField[t],
  );
  return types.reduce((acc, type) => {
    if (type === BUCKETS) {
      return {
        ...acc,
        ...createTermAggregation({ field, isNested }),
      };
    } else if ([STATS, HISTOGRAM].includes(type)) {
      return {
        ...acc,
        ...createNumericAggregation({ type, field, graphqlField }),
      };
    } else if (type === CARDINALITY) {
      return {
        ...acc,
        ...computeCardinalityAggregation({ field, graphqlField }),
      };
    } else if (type === TOPHITS) {
      return {
        ...acc,
        ...createTopHitsAggregation({ field, graphqlField }),
      };
    } else {
      return acc;
    }
  }, {});
};
