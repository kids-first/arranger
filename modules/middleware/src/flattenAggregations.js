import get from 'lodash/get';
import { HISTOGRAM, STATS, MISSING, CARDINALITY } from './constants';

function flattenAggregations({ aggregations, includeMissing = true }) {
  return Object.entries(aggregations).reduce((prunedAggs, [key, value]) => {
    const [field, aggregationType = null] = key.split(':');

    if (aggregationType === 'missing') {
      return prunedAggs;
    } else if ([STATS, HISTOGRAM].includes(aggregationType)) {
      return {
        ...prunedAggs,
        [field]: { ...prunedAggs[field], [aggregationType]: value },
      };
    } else if (CARDINALITY === aggregationType) {
      return {
        ...prunedAggs,
        [field]: { ...prunedAggs[field], [aggregationType]: value.value },
      };
    } else if (Array.isArray(value.buckets)) {
      const missing = get(aggregations, [`${field}:missing`]);
      const buckets = [
        ...value.buckets,
        ...(includeMissing && missing ? [{ ...missing, key: MISSING }] : []),
      ];

      const filterFields =
        buckets.length > 0 ? termFilterFields(buckets[0]) : [];

      return {
        ...prunedAggs,
        [field]: {
          ...prunedAggs[field],
          buckets: buckets
            .map(({ rn, ...bucket }) => ({
              ...bucket,
              doc_count: rn ? rn.doc_count : bucket.doc_count,
              ...(bucket[`${field}.hits`]
                ? {
                    top_hits:
                      bucket[`${field}.hits`]?.hits?.hits[0]?._source || {},
                  }
                : {}),
              ...(filterFields[0]
                ? {
                    filter_by_term: filterFields.reduce(
                      (ac, a) => ({ ...ac, [a]: bucket[a] }),
                      {},
                    ),
                  }
                : {}),
            }))
            .filter(b => b.doc_count),
        },
      };
    } else {
      return {
        ...prunedAggs,
        ...flattenAggregations({ aggregations: value, includeMissing }),
      };
    }
  }, {});
}
const regex = RegExp('([a-zA-Z0-9._]*).term_filter$');

const termFilterFields = values =>
  Object.keys(values).filter(s => regex.test(s));

export default flattenAggregations;
