export interface DataRow {
  [key: string]: string | number | null
}

export interface ColumnInfo {
  name: string
  type: 'numeric' | 'text' | 'date'
}

export interface Statistics {
  column: string
  count: number
  mean?: number
  median?: number
  min?: number
  max?: number
  sum?: number
}

export interface CorrelationPair {
  column1: string
  column2: string
  correlation: number
}

export interface CorrelationMatrix {
  columns: string[]
  matrix: number[][]
}

export type ChartType = 'bar' | 'line' | 'pie'

export interface FilterConfig {
  id: string
  column: string
  operator: string
  value: string
  valueTo?: string
  compareToColumn?: string
}

export interface JoinRelationship {
  id: string
  leftTable: string
  rightTable: string
  leftColumn: string
  rightColumn: string
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
  resultName: string
}

export type AggregationFunction = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'median' | 'stddev' | 'variance' | 'countDistinct'

export interface AggregationConfig {
  id: string
  column: string
  function: AggregationFunction
  alias?: string
}

export interface GroupByConfig {
  groupByColumns: string[]
  aggregations: AggregationConfig[]
}

export interface GroupedResult {
  groupKey: string
  groupValues: Record<string, string | number | null>
  aggregatedValues: Record<string, number | null>
  count: number
}
