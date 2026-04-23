import * as XLSX from 'xlsx'
import { format as formatDate } from 'date-fns'
import type { DataRow, ColumnInfo, Statistics, FilterConfig, CorrelationMatrix, CorrelationPair, GroupByConfig, AggregationFunction } from './types'

interface ParsedDateValue {
  date: Date
  hasTime: boolean
}

export function parseFile(file: File): Promise<{ data: DataRow[]; columns: ColumnInfo[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('Failed to read file'))
          return
        }

        let parsedData: DataRow[] = []

        if (file.name.endsWith('.csv')) {
          parsedData = await parseCSVAsync(data as string)
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          parsedData = await parseExcelAsync(data as ArrayBuffer)
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
        console.error('Parse error:', error)
        reject(new Error(error instanceof Error ? error.message : 'Unable to parse file. Please check the file format.'))
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

function parseCSVLine(line: string): string[] {
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

async function parseCSVAsync(text: string): Promise<DataRow[]> {
  return new Promise((resolve, reject) => {
    try {
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length === 0) {
        resolve([])
        return
      }

      if (lines.length > 10001) {
        lines.splice(10001)
      }

      const headers = parseCSVLine(lines[0])
      const data: DataRow[] = []
      const CHUNK_SIZE = 500
      let currentIndex = 1

      const processChunk = () => {
        const endIndex = Math.min(currentIndex + CHUNK_SIZE, lines.length)
        
        for (let i = currentIndex; i < endIndex; i++) {
          const values = parseCSVLine(lines[i])
          const row: DataRow = {}
          headers.forEach((header, index) => {
            const value = values[index]?.trim() || ''
            row[header] = parseValue(value)
          })
          data.push(row)
        }

        currentIndex = endIndex

        if (currentIndex < lines.length) {
          setTimeout(processChunk, 0)
        } else {
          resolve(data)
        }
      }

      processChunk()
    } catch (error) {
      reject(error)
    }
  })
}

async function parseExcelAsync(data: ArrayBuffer): Promise<DataRow[]> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(data, { 
        type: 'array', 
        cellDates: true,
        sheetRows: 10001
      })
      
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
        defval: null, 
        raw: false
      })
      
      if (jsonData.length > 10000) {
        jsonData.splice(10000)
      }

      const result: DataRow[] = []
      const CHUNK_SIZE = 500
      let currentIndex = 0

      const processChunk = () => {
        const endIndex = Math.min(currentIndex + CHUNK_SIZE, jsonData.length)
        
        for (let i = currentIndex; i < endIndex; i++) {
          const dataRow: DataRow = {}
          Object.entries(jsonData[i] as Record<string, unknown>).forEach(([key, value]) => {
            dataRow[key] = parseValue(value)
          })
          result.push(dataRow)
        }

        currentIndex = endIndex

        if (currentIndex < jsonData.length) {
          setTimeout(processChunk, 0)
        } else {
          resolve(result)
        }
      }

      processChunk()
    } catch (error) {
      reject(error)
    }
  })
}

function formatParsedDateValue(parsedDate: ParsedDateValue): string {
  return parsedDate.hasTime
    ? formatDate(parsedDate.date, 'yyyy-MM-dd HH:mm:ss')
    : formatDate(parsedDate.date, 'yyyy-MM-dd')
}

function buildValidatedDate(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0,
): Date | null {
  const date = new Date(year, month - 1, day, hour, minute, second)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null
  }

  return date
}

function normalizeYear(year: number): number {
  if (year >= 100) return year
  return year >= 70 ? 1900 + year : 2000 + year
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') return null

  const raw = value.trim()
  if (raw.length === 0) return null

  const plainNumberPattern = /^[+-]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][+-]?\d+)?$/
  const groupedNumberPattern = /^[+-]?(?:\d{1,3}(?:,\d{3})+)(?:\.\d+)?(?:[eE][+-]?\d+)?$/

  if (!plainNumberPattern.test(raw) && !groupedNumberPattern.test(raw)) {
    return null
  }

  const normalized = raw.replace(/,/g, '')
  const numericValue = Number(normalized)

  return Number.isFinite(numericValue) ? numericValue : null
}

export function parseDateValue(value: unknown): ParsedDateValue | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0
    return { date: value, hasTime }
  }

  if (typeof value !== 'string') return null

  const raw = value.trim()
  if (raw.length === 0) return null
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)) return null
  if (!/[-/.]/.test(raw)) return null

  const isoMatch = raw.match(
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  )
  if (isoMatch) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = isoMatch
    const date = buildValidatedDate(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    )
    if (date) {
      return {
        date,
        hasTime: isoMatch[4] !== undefined,
      }
    }
  }

  const slashMatch = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp][Mm]))?)?$/
  )
  if (slashMatch) {
    let [, month, day, year, hour = '0', minute = '0', second = '0', meridiem] = slashMatch
    let normalizedHour = Number(hour)

    if (meridiem) {
      const upperMeridiem = meridiem.toUpperCase()
      if (upperMeridiem === 'PM' && normalizedHour < 12) normalizedHour += 12
      if (upperMeridiem === 'AM' && normalizedHour === 12) normalizedHour = 0
    }

    const date = buildValidatedDate(
      normalizeYear(Number(year)),
      Number(month),
      Number(day),
      normalizedHour,
      Number(minute),
      Number(second),
    )
    if (date) {
      return {
        date,
        hasTime: slashMatch[4] !== undefined,
      }
    }
  }

  return null
}

function parseValue(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null

  const numericValue = parseNumericValue(value)
  if (numericValue !== null) {
    return numericValue
  }

  const parsedDate = parseDateValue(value)
  if (parsedDate) {
    return formatParsedDateValue(parsedDate)
  }

  return String(value).trim()
}

function isDateString(value: unknown): boolean {
  return parseDateValue(value) !== null
}

function detectColumns(data: DataRow[]): ColumnInfo[] {
  if (data.length === 0) return []

  const firstRow = data[0]
  const columns: ColumnInfo[] = []

  Object.keys(firstRow).forEach(key => {
    const sampleValues = data.slice(0, 50).map(row => row[key]).filter(val => val !== null)
    
    if (sampleValues.length === 0) {
      columns.push({ name: key, type: 'text' })
      return
    }

    const numericCount = sampleValues.filter(val => typeof val === 'number').length
    const stringValues = sampleValues.filter((val): val is string => typeof val === 'string' && val.trim().length > 0)
    const dateCount = stringValues.filter(val => isDateString(val)).length
    const numericRatio = numericCount / sampleValues.length
    const dateRatio = stringValues.length > 0 ? dateCount / stringValues.length : 0

    let type: 'numeric' | 'text' | 'date' = 'text'
    if (stringValues.length > 0 && numericCount === 0 && dateRatio >= 0.8) {
      type = 'date'
    } else if (numericCount > 0 && numericRatio >= 0.6) {
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
          const dateValue = parseDateValue(columnValue)
          const compareDateValue = parseDateValue(compareValue)
          
          if (!dateValue || !compareDateValue) return false
          
          const dateValueTime = dateValue.date.getTime()
          const compareDateValueTime = compareDateValue.date.getTime()
          
          switch (filter.operator) {
            case 'columnEquals':
              return dateValueTime === compareDateValueTime
            case 'columnNotEquals':
              return dateValueTime !== compareDateValueTime
            case 'columnAfter':
              return dateValueTime > compareDateValueTime
            case 'columnBefore':
              return dateValueTime < compareDateValueTime
            case 'columnGreaterThanOrEqual':
            case 'columnOnOrAfter':
              return dateValueTime >= compareDateValueTime
            case 'columnLessThanOrEqual':
            case 'columnOnOrBefore':
              return dateValueTime <= compareDateValueTime
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
        const dateValue = parseDateValue(columnValue)
        const filterDate = parseDateValue(filter.value)
        const filterDateTo = parseDateValue(filter.valueTo)

        if (!dateValue) return false

        const dateValueDayTime = new Date(dateValue.date.toDateString()).getTime()
        const filterDateTime = filterDate ? new Date(filterDate.date.toDateString()).getTime() : null
        const filterDateToTime = filterDateTo ? new Date(filterDateTo.date.toDateString()).getTime() : null

        switch (filter.operator) {
          case 'equals':
            return filterDateTime !== null && dateValueDayTime === filterDateTime
          case 'notEquals':
            return filterDateTime !== null && dateValueDayTime !== filterDateTime
          case 'after':
            return filterDateTime !== null && dateValueDayTime > filterDateTime
          case 'before':
            return filterDateTime !== null && dateValueDayTime < filterDateTime
          case 'onOrAfter':
            return filterDateTime !== null && dateValueDayTime >= filterDateTime
          case 'onOrBefore':
            return filterDateTime !== null && dateValueDayTime <= filterDateTime
          case 'between':
            return filterDateTime !== null && filterDateToTime !== null && 
                   dateValueDayTime >= filterDateTime && dateValueDayTime <= filterDateToTime
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

    const parsedDate = parseDateValue(columnValue)
    if (!parsedDate) return false

    const dateValueTime = new Date(parsedDate.date.toDateString()).getTime()
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

function calculateAggregation(values: (string | number | null)[], func: AggregationFunction, columnType: 'numeric' | 'text' | 'date'): number | null {
  const validValues = values.filter(v => v !== null)
  
  if (validValues.length === 0) return null

  switch (func) {
    case 'count':
      return validValues.length

    case 'countDistinct': {
      const uniqueValues = new Set(validValues)
      return uniqueValues.size
    }

    case 'sum': {
      if (columnType !== 'numeric') return null
      const numValues = validValues.filter((v): v is number => typeof v === 'number')
      if (numValues.length === 0) return null
      return Number(numValues.reduce((acc, val) => acc + val, 0).toFixed(2))
    }

    case 'avg': {
      if (columnType !== 'numeric') return null
      const numValues = validValues.filter((v): v is number => typeof v === 'number')
      if (numValues.length === 0) return null
      const sum = numValues.reduce((acc, val) => acc + val, 0)
      return Number((sum / numValues.length).toFixed(2))
    }

    case 'min': {
      if (columnType === 'numeric') {
        const numValues = validValues.filter((v): v is number => typeof v === 'number')
        if (numValues.length === 0) return null
        return Math.min(...numValues)
      } else if (columnType === 'date') {
        const dateValues = validValues
          .map(v => parseDateValue(v))
          .filter((parsed): parsed is ParsedDateValue => parsed !== null)
          .map(parsed => parsed.date.getTime())
        if (dateValues.length === 0) return null
        return Math.min(...dateValues)
      }
      return null
    }

    case 'max': {
      if (columnType === 'numeric') {
        const numValues = validValues.filter((v): v is number => typeof v === 'number')
        if (numValues.length === 0) return null
        return Math.max(...numValues)
      } else if (columnType === 'date') {
        const dateValues = validValues
          .map(v => parseDateValue(v))
          .filter((parsed): parsed is ParsedDateValue => parsed !== null)
          .map(parsed => parsed.date.getTime())
        if (dateValues.length === 0) return null
        return Math.max(...dateValues)
      }
      return null
    }

    case 'median': {
      if (columnType !== 'numeric') return null
      const numValues = validValues.filter((v): v is number => typeof v === 'number')
      if (numValues.length === 0) return null
      const sorted = [...numValues].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0
        ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
        : Number(sorted[mid].toFixed(2))
    }

    case 'stddev': {
      if (columnType !== 'numeric') return null
      const numValues = validValues.filter((v): v is number => typeof v === 'number')
      if (numValues.length === 0) return null
      const mean = numValues.reduce((acc, val) => acc + val, 0) / numValues.length
      const squaredDiffs = numValues.map(val => Math.pow(val - mean, 2))
      const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / numValues.length
      return Number(Math.sqrt(variance).toFixed(2))
    }

    case 'variance': {
      if (columnType !== 'numeric') return null
      const numValues = validValues.filter((v): v is number => typeof v === 'number')
      if (numValues.length === 0) return null
      const mean = numValues.reduce((acc, val) => acc + val, 0) / numValues.length
      const squaredDiffs = numValues.map(val => Math.pow(val - mean, 2))
      return Number((squaredDiffs.reduce((acc, val) => acc + val, 0) / numValues.length).toFixed(2))
    }

    default:
      return null
  }
}

export function performGroupByAggregation(
  data: DataRow[],
  groupByColumns: string[],
  aggregations: { column: string; function: AggregationFunction; alias?: string }[],
  columns: ColumnInfo[]
): DataRow[] {
  if (groupByColumns.length === 0 && aggregations.length === 0) return data

  const groups = new Map<string, DataRow[]>()

  if (groupByColumns.length === 0) {
    groups.set('__all__', data)
  } else {
    data.forEach(row => {
      const groupKey = groupByColumns
        .map(col => {
          const val = row[col]
          return val === null ? 'NULL' : String(val)
        })
        .join('|||')
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(row)
    })
  }

  const results: DataRow[] = []

  groups.forEach((groupRows, groupKey) => {
    const resultRow: DataRow = {}

    if (groupByColumns.length > 0) {
      groupByColumns.forEach((col, index) => {
        const keyParts = groupKey.split('|||')
        resultRow[col] = keyParts[index] === 'NULL' ? null : keyParts[index]
      })
    }

    aggregations.forEach(agg => {
      const column = columns.find(c => c.name === agg.column)
      const columnType = column?.type || 'text'
      const values = groupRows.map(row => row[agg.column])
      const result = calculateAggregation(values, agg.function, columnType)
      const outputKey = agg.alias || `${agg.function}(${agg.column})`
      resultRow[outputKey] = result
    })

    results.push(resultRow)
  })

  return results
}
