import get from 'lodash/get';
import { HISTOGRAM, STATS, MISSING, CARDINALITY, TOPHITS } from './constants';

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
    } else if (TOPHITS === aggregationType && Array.isArray(value.buckets)) {
      return {
        ...prunedAggs,
        [field]: {
          top_hits: value.buckets.map(b => ({
            key: b.key,
            doc_count: b.doc_count,
            hits: b[`${field}.hits`]?.hits?.hits[0]?._source || {},
          })),
        },
      };
    } else if (Array.isArray(value.buckets)) {
      const missing = get(aggregations, [`${field}:missing`]);
      const buckets = [
        ...value.buckets,
        ...(includeMissing && missing ? [{ ...missing, key: MISSING }] : []),
      ];
      return {
        ...prunedAggs,
        [field]: {
          ...prunedAggs[field],
          buckets: buckets
            .map(({ rn, ...bucket }) => ({
              ...bucket,
              doc_count: rn ? rn.doc_count : bucket.doc_count,
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

export default flattenAggregations;
