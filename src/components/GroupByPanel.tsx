import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, X, FunnelSimple, Sparkle } from '@phosphor-icons/react'
import type { ColumnInfo, DataRow, AggregationFunction } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'

interface GroupByPanelProps {
  data: DataRow[]
  columns: ColumnInfo[]
  onGroupResult: (resultData: DataRow[], resultColumns: ColumnInfo[], queryName: string) => void
}

interface AggregationConfig {
  id: string
  column: string
  function: AggregationFunction
  alias: string
}

export function GroupByPanel({ data, columns, onGroupResult }: GroupByPanelProps) {
  const { t } = useLanguage()
  const [groupByColumns, setGroupByColumns] = useState<string[]>([])
  const [aggregations, setAggregations] = useState<AggregationConfig[]>([])
  const [resultName, setResultName] = useState(t('groupBy.defaultResultName'))

  const aggregationFunctions: { value: AggregationFunction; label: string; description: string }[] = [
    { value: 'count', label: t('groupBy.fn.count'), description: t('groupBy.fn.count.desc') },
    { value: 'countDistinct', label: t('groupBy.fn.countDistinct'), description: t('groupBy.fn.countDistinct.desc') },
    { value: 'sum', label: t('groupBy.fn.sum'), description: t('groupBy.fn.sum.desc') },
    { value: 'avg', label: t('groupBy.fn.avg'), description: t('groupBy.fn.avg.desc') },
    { value: 'min', label: t('groupBy.fn.min'), description: t('groupBy.fn.min.desc') },
    { value: 'max', label: t('groupBy.fn.max'), description: t('groupBy.fn.max.desc') },
    { value: 'median', label: t('groupBy.fn.median'), description: t('groupBy.fn.median.desc') },
    { value: 'stddev', label: t('groupBy.fn.stddev'), description: t('groupBy.fn.stddev.desc') },
    { value: 'variance', label: t('groupBy.fn.variance'), description: t('groupBy.fn.variance.desc') },
  ]

  const availableColumns = useMemo(() => {
    return columns.map(col => col.name)
  }, [columns])

  const numericColumns = useMemo(() => {
    return columns.filter(col => col.type === 'numeric').map(col => col.name)
  }, [columns])

  const addGroupByColumn = () => {
    const available = availableColumns.find(col => !groupByColumns.includes(col))
    if (available) {
      setGroupByColumns([...groupByColumns, available])
    }
  }

  const removeGroupByColumn = (index: number) => {
    setGroupByColumns(groupByColumns.filter((_, i) => i !== index))
  }

  const updateGroupByColumn = (index: number, newColumn: string) => {
    const updated = [...groupByColumns]
    updated[index] = newColumn
    setGroupByColumns(updated)
  }

  const addAggregation = () => {
    const availableColumn = numericColumns.length > 0 ? numericColumns[0] : availableColumns[0]
    if (availableColumn) {
      const newAgg: AggregationConfig = {
        id: `agg-${Date.now()}`,
        column: availableColumn,
        function: 'count',
        alias: ''
      }
      setAggregations([...aggregations, newAgg])
    }
  }

  const removeAggregation = (id: string) => {
    setAggregations(aggregations.filter(agg => agg.id !== id))
  }

  const updateAggregation = (id: string, field: keyof AggregationConfig, value: string) => {
    setAggregations(aggregations.map(agg =>
      agg.id === id ? { ...agg, [field]: value } : agg
    ))
  }

  const getAvailableFunctions = (columnName: string): AggregationFunction[] => {
    const column = columns.find(c => c.name === columnName)
    if (!column) return ['count', 'countDistinct']

    if (column.type === 'numeric') {
      return aggregationFunctions.map(f => f.value)
    } else if (column.type === 'date') {
      return ['count', 'countDistinct', 'min', 'max']
    }
    return ['count', 'countDistinct']
  }

  const executeGroupBy = () => {
    if (aggregations.length === 0) {
      return
    }

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
    const resultColumns: ColumnInfo[] = []

    groupByColumns.forEach(col => {
      const originalCol = columns.find(c => c.name === col)
      if (originalCol) {
        resultColumns.push(originalCol)
      }
    })

    aggregations.forEach(agg => {
      const outputKey = agg.alias || `${agg.function}(${agg.column})`
      resultColumns.push({ name: outputKey, type: 'numeric' })
    })

    groups.forEach((groupRows, groupKey) => {
      const resultRow: DataRow = {}

      if (groupByColumns.length > 0) {
        groupByColumns.forEach((col, index) => {
          const keyParts = groupKey.split('|||')
          const value = keyParts[index] === 'NULL' ? null : keyParts[index]
          const originalCol = columns.find(c => c.name === col)
          
          if (originalCol?.type === 'numeric' && value !== null) {
            resultRow[col] = Number(value)
          } else {
            resultRow[col] = value
          }
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

    onGroupResult(results, resultColumns, resultName)
  }

  const calculateAggregation = (
    values: (string | number | null)[],
    func: AggregationFunction,
    columnType: 'numeric' | 'text' | 'date'
  ): number | null => {
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
          const dateValues = validValues.map(v => new Date(String(v)).getTime()).filter(t => !isNaN(t))
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
          const dateValues = validValues.map(v => new Date(String(v)).getTime()).filter(t => !isNaN(t))
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

  const canExecute = aggregations.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FunnelSimple size={24} weight="duotone" className="text-primary" />
          <div>
              <CardTitle>{t('groupBy.title')}</CardTitle>
              <CardDescription>
              {t('groupBy.description')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">{t('groupBy.columns')}</Label>
            <Button
              onClick={addGroupByColumn}
              size="sm"
              variant="outline"
              disabled={groupByColumns.length >= availableColumns.length}
            >
              <Plus size={16} weight="bold" className="mr-1" />
              {t('groupBy.addColumn')}
            </Button>
          </div>

          {groupByColumns.length === 0 && (
            <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
              {t('groupBy.noColumns')}
            </div>
          )}

          <div className="space-y-2">
            {groupByColumns.map((col, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select value={col} onValueChange={(value) => updateGroupByColumn(index, value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map(column => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => removeGroupByColumn(index)}
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                >
                  <X size={16} weight="bold" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">{t('groupBy.aggregations')}</Label>
            <Button
              onClick={addAggregation}
              size="sm"
              variant="outline"
            >
              <Plus size={16} weight="bold" className="mr-1" />
              {t('groupBy.addAggregation')}
            </Button>
          </div>

          {aggregations.length === 0 && (
            <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
              {t('groupBy.noAggregations')}
            </div>
          )}

          <div className="space-y-3">
            {aggregations.map((agg) => {
              const availableFuncs = getAvailableFunctions(agg.column)
              const currentFunc = aggregationFunctions.find(f => f.value === agg.function)
              
              return (
                <div key={agg.id} className="p-4 border rounded-lg space-y-3 bg-card">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{t('groupBy.function')}</Label>
                          <Select 
                            value={agg.function} 
                            onValueChange={(value) => updateAggregation(agg.id, 'function', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {aggregationFunctions
                                .filter(f => availableFuncs.includes(f.value))
                                .map(func => (
                                  <SelectItem key={func.value} value={func.value}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{func.label}</span>
                                      <span className="text-xs text-muted-foreground">{func.description}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{t('groupBy.column')}</Label>
                          <Select 
                            value={agg.column} 
                            onValueChange={(value) => updateAggregation(agg.id, 'column', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableColumns.map(column => {
                                const colInfo = columns.find(c => c.name === column)
                                return (
                                  <SelectItem key={column} value={column}>
                                    <div className="flex items-center gap-2">
                                      <span>{column}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {colInfo ? t(`columnType.${colInfo.type}`) : t('common.none')}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {t('groupBy.outputName')}
                        </Label>
                        <Input
                          placeholder={`${agg.function}(${agg.column})`}
                          value={agg.alias}
                          onChange={(e) => updateAggregation(agg.id, 'alias', e.target.value)}
                        />
                      </div>

                      {currentFunc && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkle size={12} weight="fill" />
                          {currentFunc.description}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => removeAggregation(agg.id)}
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                    >
                      <X size={16} weight="bold" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('groupBy.resultName')}</Label>
          <Input
            value={resultName}
            onChange={(e) => setResultName(e.target.value)}
            placeholder={t('groupBy.resultNamePlaceholder')}
          />
        </div>

        <Button
          onClick={executeGroupBy}
          disabled={!canExecute}
          className="w-full"
          size="lg"
        >
          <FunnelSimple size={20} weight="bold" className="mr-2" />
          {t('groupBy.execute')}
        </Button>
      </CardContent>
    </Card>
  )
}
