export let typeDefs = `
  type Stats {
    max: Float
    min: Float
    count: Int
    avg: Float
    sum: Float
  }

  type Bucket {
    doc_count: Int
    key: String
    key_as_string: String
    hits:JSON
  }

  type NumericAggregations {
    stats: Stats
    histogram(interval: Float): Aggregations
  }

  type Aggregations {
    buckets: [Bucket]
    cardinality(precision_threshold:Int): Int
    top_hits(_source:String, size:Int): [Bucket]
  }
`;
