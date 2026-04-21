import * as XLSX from 'xlsx'
import type { DataRow, ColumnInfo, Statistics, FilterConfig } from './types'

export function parseFile(file: File): Promise<{ data: DataRow[]; columns: ColumnInfo[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('Failed to read file'))
          return
        }

        let parsedData: DataRow[] = []

        if (file.name.endsWith('.csv')) {
          parsedData = parseCSV(data as string)
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          parsedData = parseExcel(data as ArrayBuffer)
        } else {
          reject(new Error('Unsupported file format'))
          return
        }

        if (parsedData.length === 0) {
          reject(new Error('The uploaded file contains no data'))
          return
        }

        const columns = detectColumns(parsedData)
        resolve({ data: parsedData, columns })
      } catch (error) {
        reject(new Error('Unable to parse file. Please check the file format.'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

function parseCSV(text: string): DataRow[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const data: DataRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row: DataRow = {}
    headers.forEach((header, index) => {
      const value = values[index]?.trim()
      row[header] = parseValue(value)
    })
    data.push(row)
  }

  return data
}

function parseExcel(data: ArrayBuffer): DataRow[] {
  const workbook = XLSX.read(data, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: null })
  
  return jsonData.map(row => {
    const dataRow: DataRow = {}
    Object.entries(row as Record<string, unknown>).forEach(([key, value]) => {
      dataRow[key] = parseValue(value)
    })
    return dataRow
  })
}

function parseValue(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null
  
  const strValue = String(value).trim()
  const numValue = Number(strValue)
  
  if (!isNaN(numValue) && strValue !== '') {
    return numValue
  }
  
  return strValue
}

function detectColumns(data: DataRow[]): ColumnInfo[] {
  if (data.length === 0) return []

  const firstRow = data[0]
  const columns: ColumnInfo[] = []

  Object.keys(firstRow).forEach(key => {
    const isNumeric = data.slice(0, 10).some(row => typeof row[key] === 'number')
    columns.push({
      name: key,
      type: isNumeric ? 'numeric' : 'text'
    })
  })

  return columns
}

export function calculateStatistics(data: DataRow[], columns: ColumnInfo[]): Statistics[] {
  const stats: Statistics[] = []

  columns.filter(col => col.type === 'numeric').forEach(col => {
    const values = data
      .map(row => row[col.name])
      .filter((val): val is number => typeof val === 'number')

    if (values.length === 0) return

    const sum = values.reduce((acc, val) => acc + val, 0)
    const mean = sum / values.length
    const sorted = [...values].sort((a, b) => a - b)
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]

    stats.push({
      column: col.name,
      count: values.length,
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
      min: Math.min(...values),
      max: Math.max(...values),
      sum: Number(sum.toFixed(2))
    })
  })

  return stats
}

export function applyFilters(data: DataRow[], filters: FilterConfig[], columns: ColumnInfo[]): DataRow[] {
  if (filters.length === 0) return data

  return data.filter(row => {
    return filters.every(filter => {
      const columnValue = row[filter.column]
      const column = columns.find(c => c.name === filter.column)
      
      if (!column) return true

      if (column.type === 'numeric') {
        const numValue = typeof columnValue === 'number' ? columnValue : null
        const filterValue = filter.value ? Number(filter.value) : null
        const filterValueTo = filter.valueTo ? Number(filter.valueTo) : null

        if (numValue === null) return false

        switch (filter.operator) {
          case 'equals':
            return filterValue !== null && numValue === filterValue
          case 'notEquals':
            return filterValue !== null && numValue !== filterValue
          case 'greaterThan':
            return filterValue !== null && numValue > filterValue
          case 'lessThan':
            return filterValue !== null && numValue < filterValue
          case 'greaterThanOrEqual':
            return filterValue !== null && numValue >= filterValue
          case 'lessThanOrEqual':
            return filterValue !== null && numValue <= filterValue
          case 'between':
            return filterValue !== null && filterValueTo !== null && numValue >= filterValue && numValue <= filterValueTo
          default:
            return true
        }
      } else {
        const strValue = columnValue !== null ? String(columnValue).toLowerCase() : ''
        const filterValue = filter.value.toLowerCase()

        switch (filter.operator) {
          case 'equals':
            return strValue === filterValue
          case 'notEquals':
            return strValue !== filterValue
          case 'contains':
            return strValue.includes(filterValue)
          case 'notContains':
            return !strValue.includes(filterValue)
          case 'startsWith':
            return strValue.startsWith(filterValue)
          case 'endsWith':
            return strValue.endsWith(filterValue)
          default:
            return true
        }
      }
    })
  })
}
