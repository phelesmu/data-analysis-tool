import * as XLSX from 'xlsx'
import type { DataRow, ColumnInfo, Statistics, FilterConfig, CorrelationMatrix, CorrelationPair } from './types'

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

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  const headers = parseCSVLine(lines[0])
  const data: DataRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: DataRow = {}
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || ''
      row[header] = parseValue(value)
    })
    data.push(row)
  }

  return data
}

function parseExcel(data: ArrayBuffer): DataRow[] {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: null, raw: false })
  
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
  
  if (value instanceof Date) {
    const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0
    if (hasTime) {
      return value.toISOString().replace('T', ' ').split('.')[0]
    }
    return value.toISOString().split('T')[0]
  }
  
  const strValue = String(value).trim()
  
  if (isDateString(strValue)) {
    const date = new Date(strValue)
    if (!isNaN(date.getTime())) {
      const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0
      if (hasTime) {
        return date.toISOString().replace('T', ' ').split('.')[0]
      }
      return date.toISOString().split('T')[0]
    }
  }
  
  const numValue = Number(strValue)
  
  if (!isNaN(numValue) && strValue !== '') {
    return numValue
  }
  
  return strValue
}

function isDateString(value: unknown): boolean {
  if (typeof value !== 'string' && typeof value !== 'number') return false
  
  const str = String(value).trim()
  if (str.length === 0) return false
  
  const datePatterns = [
    /^\d{4}-\d{1,2}-\d{1,2}$/,
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    /^\d{1,2}-\d{1,2}-\d{4}$/,
    /^\d{4}\/\d{1,2}\/\d{1,2}$/,
    /^\d{1,2}\.\d{1,2}\.\d{4}$/,
    /^\d{4}\.\d{1,2}\.\d{1,2}$/,
    /^\d{4}-\d{1,2}-\d{1,2}[T\s]\d{1,2}:\d{1,2}(:\d{1,2})?/,
    /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{1,2}(:\d{1,2})?/,
  ]
  
  if (!datePatterns.some(pattern => pattern.test(str))) {
    return false
  }
  
  const date = new Date(str)
  return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100
}

function detectColumns(data: DataRow[]): ColumnInfo[] {
  if (data.length === 0) return []

  const firstRow = data[0]
  const columns: ColumnInfo[] = []

  Object.keys(firstRow).forEach(key => {
    const sampleValues = data.slice(0, 20).map(row => row[key]).filter(val => val !== null)
    
    if (sampleValues.length === 0) {
      columns.push({ name: key, type: 'text' })
      return
    }
    
    const isNumeric = sampleValues.some(val => typeof val === 'number')
    const isDate = sampleValues.filter(val => typeof val === 'string').length > 0 &&
                  sampleValues.filter(val => typeof val === 'string').every(val => isDateString(val))
    
    let type: 'numeric' | 'text' | 'date' = 'text'
    if (isDate) {
      type = 'date'
    } else if (isNumeric) {
      type = 'numeric'
    }
    
    columns.push({ name: key, type })
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

      if (filter.operator.startsWith('column')) {
        const compareColumn = filter.compareToColumn
        if (!compareColumn) return true
        
        const compareValue = row[compareColumn]
        
        if (column.type === 'date') {
          const dateValue = columnValue !== null ? new Date(String(columnValue)) : null
          const compareDateValue = compareValue !== null ? new Date(String(compareValue)) : null
          
          if (!dateValue || isNaN(dateValue.getTime()) || !compareDateValue || isNaN(compareDateValue.getTime())) return false
          
          const dateValueTime = new Date(dateValue.toDateString()).getTime()
          const compareDateValueTime = new Date(compareDateValue.toDateString()).getTime()
          
          switch (filter.operator) {
            case 'columnEquals':
              return dateValueTime === compareDateValueTime
            case 'columnNotEquals':
              return dateValueTime !== compareDateValueTime
            case 'columnAfter':
              return dateValueTime > compareDateValueTime
            case 'columnBefore':
              return dateValueTime < compareDateValueTime
            default:
              return true
          }
        } else if (column.type === 'numeric') {
          const numValue = typeof columnValue === 'number' ? columnValue : null
          const compareNumValue = typeof compareValue === 'number' ? compareValue : null
          
          if (numValue === null || compareNumValue === null) return false
          
          switch (filter.operator) {
            case 'columnEquals':
              return numValue === compareNumValue
            case 'columnNotEquals':
              return numValue !== compareNumValue
            case 'columnGreaterThan':
              return numValue > compareNumValue
            case 'columnLessThan':
              return numValue < compareNumValue
            case 'columnGreaterThanOrEqual':
              return numValue >= compareNumValue
            case 'columnLessThanOrEqual':
              return numValue <= compareNumValue
            default:
              return true
          }
        } else {
          const strValue = columnValue !== null ? String(columnValue).toLowerCase() : ''
          const compareStrValue = compareValue !== null ? String(compareValue).toLowerCase() : ''
          
          switch (filter.operator) {
            case 'columnEquals':
              return strValue === compareStrValue
            case 'columnNotEquals':
              return strValue !== compareStrValue
            case 'columnContains':
              return strValue.includes(compareStrValue)
            case 'columnIn':
              return compareStrValue.includes(strValue)
            default:
              return true
          }
        }
      }

      if (column.type === 'date') {
        const dateValue = columnValue !== null ? new Date(String(columnValue)) : null
        const filterDate = filter.value ? new Date(filter.value) : null
        const filterDateTo = filter.valueTo ? new Date(filter.valueTo) : null

        if (!dateValue || isNaN(dateValue.getTime())) return false

        const dateValueTime = new Date(dateValue.toDateString()).getTime()
        const filterDateTime = filterDate ? new Date(filterDate.toDateString()).getTime() : null
        const filterDateToTime = filterDateTo ? new Date(filterDateTo.toDateString()).getTime() : null

        switch (filter.operator) {
          case 'equals':
            return filterDateTime !== null && dateValueTime === filterDateTime
          case 'notEquals':
            return filterDateTime !== null && dateValueTime !== filterDateTime
          case 'after':
            return filterDateTime !== null && dateValueTime > filterDateTime
          case 'before':
            return filterDateTime !== null && dateValueTime < filterDateTime
          case 'onOrAfter':
            return filterDateTime !== null && dateValueTime >= filterDateTime
          case 'onOrBefore':
            return filterDateTime !== null && dateValueTime <= filterDateTime
          case 'between':
            return filterDateTime !== null && filterDateToTime !== null && 
                   dateValueTime >= filterDateTime && dateValueTime <= filterDateToTime
          default:
            return true
        }
      } else if (column.type === 'numeric') {
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

export function applyDateRangeFilter(data: DataRow[], column: string, startDate: Date, endDate: Date): DataRow[] {
  return data.filter(row => {
    const columnValue = row[column]
    if (columnValue === null) return false

    const dateValue = new Date(String(columnValue))
    if (isNaN(dateValue.getTime())) return false

    const dateValueTime = new Date(dateValue.toDateString()).getTime()
    const startDateTime = new Date(startDate.toDateString()).getTime()
    const endDateTime = new Date(endDate.toDateString()).getTime()

    return dateValueTime >= startDateTime && dateValueTime <= endDateTime
  })
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n === 0 || n !== y.length) return 0

  const sumX = x.reduce((acc, val) => acc + val, 0)
  const sumY = y.reduce((acc, val) => acc + val, 0)
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0)
  const sumX2 = x.reduce((acc, val) => acc + val * val, 0)
  const sumY2 = y.reduce((acc, val) => acc + val * val, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0

  return numerator / denominator
}

export function calculateCorrelationMatrix(data: DataRow[], columns: ColumnInfo[]): CorrelationMatrix {
  const numericColumns = columns.filter(col => col.type === 'numeric')
  
  if (numericColumns.length < 2) {
    return { columns: [], matrix: [] }
  }

  const columnNames = numericColumns.map(col => col.name)
  const matrix: number[][] = []

  for (let i = 0; i < numericColumns.length; i++) {
    const row: number[] = []
    const col1 = numericColumns[i]
    const values1 = data
      .map(row => row[col1.name])
      .filter((val): val is number => typeof val === 'number')

    for (let j = 0; j < numericColumns.length; j++) {
      if (i === j) {
        row.push(1)
        continue
      }

      const col2 = numericColumns[j]
      const values2 = data
        .map(row => row[col2.name])
        .filter((val): val is number => typeof val === 'number')

      const minLength = Math.min(values1.length, values2.length)
      const correlation = calculatePearsonCorrelation(
        values1.slice(0, minLength),
        values2.slice(0, minLength)
      )
      
      row.push(Number(correlation.toFixed(3)))
    }
    matrix.push(row)
  }

  return { columns: columnNames, matrix }
}

export function getTopCorrelations(correlationMatrix: CorrelationMatrix, limit: number = 10): CorrelationPair[] {
  const pairs: CorrelationPair[] = []

  for (let i = 0; i < correlationMatrix.columns.length; i++) {
    for (let j = i + 1; j < correlationMatrix.columns.length; j++) {
      pairs.push({
        column1: correlationMatrix.columns[i],
        column2: correlationMatrix.columns[j],
        correlation: correlationMatrix.matrix[i][j]
      })
    }
  }

  return pairs
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, limit)
}

export function exportToCSV(data: DataRow[], filename: string = 'data.csv'): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) return ''
      const strValue = String(value)
      return strValue.includes(',') ? `"${strValue}"` : strValue
    }).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
