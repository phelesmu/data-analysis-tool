import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ChartBar } from '@phosphor-icons/react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import type { ColumnInfo, DataRow } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'

interface AggregatedBarChartProps {
  data: DataRow[]
  columns: ColumnInfo[]
}

const CHART_COLORS = [
  'oklch(0.646 0.222 41.116)',
  'oklch(0.6 0.118 184.704)',
  'oklch(0.398 0.07 227.392)',
  'oklch(0.828 0.189 84.429)',
  'oklch(0.769 0.188 70.08)',
  'oklch(0.7 0.15 265)',
  'oklch(0.7 0.15 195)',
  'oklch(0.577 0.245 27.325)',
]

export function AggregatedBarChart({ data, columns }: AggregatedBarChartProps) {
  const { t } = useLanguage()
  const categoryColumns = useMemo(() => {
    return columns.filter(col => col.type === 'text' || col.type === 'date')
  }, [columns])

  const numericColumns = useMemo(() => {
    return columns.filter(col => col.type === 'numeric')
  }, [columns])

  const [categoryColumn, setCategoryColumn] = useState<string>(
    categoryColumns.length > 0 ? categoryColumns[0].name : ''
  )
  
  const [valueColumns, setValueColumns] = useState<string[]>(
    numericColumns.length > 0 ? [numericColumns[0].name] : []
  )

  const chartData = useMemo(() => {
    if (!categoryColumn || valueColumns.length === 0 || data.length === 0) {
      return []
    }

    return data.map(row => {
      const result: Record<string, string | number | null> = {
        category: String(row[categoryColumn] ?? t('common.notAvailable'))
      }
      
      valueColumns.forEach(col => {
        const value = row[col]
        result[col] = typeof value === 'number' ? value : null
      })
      
      return result
    }).slice(0, 50)
  }, [data, categoryColumn, valueColumns])

  const toggleValueColumn = (column: string) => {
    setValueColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(c => c !== column)
      } else {
        return [...prev, column]
      }
    })
  }

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toFixed(2)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-2 text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="font-medium">{formatValue(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChartBar size={24} weight="duotone" className="text-primary" />
            <div>
              <CardTitle>{t('aggChart.title')}</CardTitle>
              <CardDescription>
                {t('aggChart.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {t('aggChart.noData')}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (categoryColumns.length === 0 || numericColumns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChartBar size={24} weight="duotone" className="text-primary" />
            <div>
              <CardTitle>{t('aggChart.title')}</CardTitle>
              <CardDescription>
                {t('aggChart.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {t('aggChart.needColumns')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartBar size={24} weight="duotone" className="text-primary" />
          <div>
            <CardTitle>{t('aggChart.title')}</CardTitle>
            <CardDescription>
              {t('aggChart.description')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('aggChart.categoryAxis')}</Label>
            <Select value={categoryColumn} onValueChange={setCategoryColumn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryColumns.map(col => (
                  <SelectItem key={col.name} value={col.name}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('aggChart.valueAxis')}</Label>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map(col => (
                <button
                  key={col.name}
                  onClick={() => toggleValueColumn(col.name)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    valueColumns.includes(col.name)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border hover:bg-accent'
                  }`}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {chartData.length > 0 && valueColumns.length > 0 ? (
          <div className="w-full h-[400px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 265)" opacity={0.3} />
                <XAxis 
                  dataKey="category" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: 'oklch(0.5 0.01 265)', fontSize: 12 }}
                  stroke="oklch(0.88 0.01 265)"
                />
                <YAxis 
                  tickFormatter={formatValue}
                  tick={{ fill: 'oklch(0.5 0.01 265)', fontSize: 12 }}
                  stroke="oklch(0.88 0.01 265)"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="square"
                />
                {valueColumns.map((col, index) => (
                  <Bar 
                    key={col} 
                    dataKey={col} 
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {t('aggChart.selectValue')}
          </div>
        )}

        {chartData.length === 50 && data.length > 50 && (
          <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded-md">
            {t('aggChart.showingFirstGroups', { count: data.length })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
