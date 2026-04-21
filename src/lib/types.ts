export interface DataRow {
  [key: string]: string | number | null
}

export interface ColumnInfo {
  name: string
  type: 'numeric' | 'text'
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

export type ChartType = 'bar' | 'line' | 'pie'

export interface FilterConfig {
  id: string
  column: string
  operator: string
  value: string
  valueTo?: string
}
