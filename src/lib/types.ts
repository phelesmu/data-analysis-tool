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
}
