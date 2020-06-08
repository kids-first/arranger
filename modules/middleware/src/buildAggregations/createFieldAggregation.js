import get from 'lodash/get';
import { STATS, HISTOGRAM, BUCKETS, CARDINALITY, TOPHITS } from '../constants';
import isEmpty from 'lodash/isEmpty';
import getTermFilter from '../buildQuery/index';

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

const createTermAggregation = ({ field, isNested, graphqlField }) => {
  const topHits = graphqlField?.buckets?.top_hits || null;
  const termFilter = graphqlField?.buckets?.filter_by_term || null;
  const source = topHits?.__arguments[0]?._source || null;
  const size = topHits?.__arguments[1]?.size || 1;
  let innerAggs = {};
  if (isNested) {
    innerAggs = { ...innerAggs, rn: { reverse_nested: {} } };
  }
  if (topHits) {
    innerAggs = {
      ...innerAggs,
      [`${field}.hits`]: {
        top_hits: {
          _source: source?.value || [],
          size: size?.value,
        },
      },
    };
  }

  if (termFilter) {
    const {
      op,
      content: { value, field },
    } = termFilter.__arguments[0].filter.value;
    innerAggs = {
      ...innerAggs,
      [`${field}.term_filter`]: {
        filter: {
          term: {
            [field]: value,
          },
        },
      },
    };
  }

  return {
    [field]: {
      ...(!isEmpty(innerAggs) ? { aggs: { ...innerAggs } } : {}),
      terms: { field, size: MAX_AGGREGATION_SIZE },
    },
    [`${field}:missing`]: {
      ...(isNested ? { aggs: { rn: { reverse_nested: {} } } } : {}),
      missing: { field: field },
    },
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
export default ({ field, graphqlField = {}, isNested = false }) => {
  const types = [BUCKETS, STATS, HISTOGRAM, CARDINALITY, TOPHITS].filter(
    t => graphqlField[t],
  );
  return types.reduce((acc, type) => {
    if (type === BUCKETS) {
      return {
        ...acc,
        ...createTermAggregation({ field, isNested, graphqlField }),
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
    } else {
      return acc;
    }
  }, {});
};
