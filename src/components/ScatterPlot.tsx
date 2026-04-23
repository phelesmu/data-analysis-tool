import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, LineChart, ComposedChart } from 'recharts'
import { ChartScatter } from '@phosphor-icons/react'
import type { DataRow, ColumnInfo } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'

interface ScatterPlotProps {
  data: DataRow[]
  columns: ColumnInfo[]
}

function calculateLinearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = data.length
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 }

  const sumX = data.reduce((acc, d) => acc + d.x, 0)
  const sumY = data.reduce((acc, d) => acc + d.y, 0)
  const sumXY = data.reduce((acc, d) => acc + d.x * d.y, 0)
  const sumX2 = data.reduce((acc, d) => acc + d.x * d.x, 0)
  const sumY2 = data.reduce((acc, d) => acc + d.y * d.y, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const meanY = sumY / n
  const ssTotal = data.reduce((acc, d) => acc + Math.pow(d.y - meanY, 2), 0)
  const ssResidual = data.reduce((acc, d) => acc + Math.pow(d.y - (slope * d.x + intercept), 2), 0)
  const r2 = 1 - (ssResidual / ssTotal)

  return { slope, intercept, r2 }
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

function getCorrelationLabel(value: number, t: ReturnType<typeof useLanguage>['t']): { label: string; color: string } {
  const abs = Math.abs(value)
  if (abs >= 0.7) return { label: t('correlation.strong'), color: 'bg-red-500' }
  if (abs >= 0.5) return { label: t('correlation.moderate'), color: 'bg-orange-500' }
  if (abs >= 0.3) return { label: t('correlation.weak'), color: 'bg-yellow-500' }
  return { label: t('correlation.veryWeak'), color: 'bg-blue-500' }
}

export function ScatterPlot({ data, columns }: ScatterPlotProps) {
  const { t } = useLanguage()
  const numericColumns = useMemo(() => 
    columns.filter(col => col.type === 'numeric'),
    [columns]
  )

  const [xColumn, setXColumn] = useState<string>(numericColumns[0]?.name || '')
  const [yColumn, setYColumn] = useState<string>(numericColumns[1]?.name || '')

  const scatterData = useMemo(() => {
    if (!xColumn || !yColumn) return []

    return data
      .filter(row => 
        typeof row[xColumn] === 'number' && 
        typeof row[yColumn] === 'number'
      )
      .map(row => ({
        x: row[xColumn] as number,
        y: row[yColumn] as number,
      }))
  }, [data, xColumn, yColumn])

  const regression = useMemo(() => {
    return calculateLinearRegression(scatterData)
  }, [scatterData])

  const correlation = useMemo(() => {
    const xValues = scatterData.map(d => d.x)
    const yValues = scatterData.map(d => d.y)
    return calculatePearsonCorrelation(xValues, yValues)
  }, [scatterData])

  const regressionLine = useMemo(() => {
    if (scatterData.length === 0) return []
    
    const xMin = Math.min(...scatterData.map(d => d.x))
    const xMax = Math.max(...scatterData.map(d => d.x))
    
    return [
      { x: xMin, y: regression.slope * xMin + regression.intercept },
      { x: xMax, y: regression.slope * xMax + regression.intercept }
    ]
  }, [scatterData, regression])

  const correlationInfo = useMemo(() => {
    return getCorrelationLabel(correlation, t)
  }, [correlation, t])

  if (numericColumns.length < 2) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChartScatter size={24} weight="bold" className="text-primary" />
            <CardTitle>{t('scatter.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('scatter.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ChartScatter size={48} weight="light" className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('scatter.needMoreColumns')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartScatter size={24} weight="bold" className="text-primary" />
          <CardTitle>{t('scatter.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('scatter.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('scatter.xAxis')}</label>
              <Select value={xColumn} onValueChange={setXColumn}>
                <SelectTrigger>
                  <SelectValue placeholder={t('scatter.selectX')} />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns.map(col => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('scatter.yAxis')}</label>
              <Select value={yColumn} onValueChange={setYColumn}>
                <SelectTrigger>
                  <SelectValue placeholder={t('scatter.selectY')} />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns.map(col => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {scatterData.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('scatter.correlation')}:</span>
                <span className="text-lg font-bold font-mono">{correlation.toFixed(3)}</span>
                <Badge className={correlationInfo.color}>{correlationInfo.label}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R²:</span>
                <span className="text-lg font-bold font-mono">{regression.r2.toFixed(3)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('scatter.dataPoints')}:</span>
                <span className="text-lg font-bold font-mono">{scatterData.length}</span>
              </div>
            </div>
          )}

          <div className="h-[500px]">
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 265)" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    domain={['auto', 'auto']}
                    label={{ 
                      value: xColumn, 
                      position: 'insideBottom', 
                      offset: -10,
                      style: { fill: 'oklch(0.2 0 0)', fontWeight: 600 }
                    }}
                    tick={{ fill: 'oklch(0.5 0.01 265)' }}
                    stroke="oklch(0.88 0.01 265)"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    label={{ 
                      value: yColumn, 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: 'oklch(0.2 0 0)', fontWeight: 600 }
                    }}
                    tick={{ fill: 'oklch(0.5 0.01 265)' }}
                    stroke="oklch(0.88 0.01 265)"
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: 'oklch(1 0 0)',
                      border: '1px solid oklch(0.88 0.01 265)',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                    formatter={(value: number) => [value.toFixed(2), '']}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '20px' }}
                  />
                  
                  <Scatter 
                    name={t('scatter.legendDataPoints')} 
                    data={scatterData} 
                    fill="oklch(0.35 0.15 265)"
                    fillOpacity={0.6}
                  />
                  
                  <Line 
                    name={t('scatter.legendRegressionLine')} 
                    data={regressionLine} 
                    dataKey="y"
                    stroke="oklch(0.7 0.15 195)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {t('scatter.noData')}
              </div>
            )}
          </div>

          {scatterData.length > 0 && (
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="text-sm font-semibold mb-2">{t('scatter.regressionTitle')}</h4>
              <div className="space-y-1 text-sm font-mono">
                <p className="text-muted-foreground">
                  y = <span className="text-foreground font-medium">{regression.slope.toFixed(4)}</span>x + <span className="text-foreground font-medium">{regression.intercept.toFixed(4)}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {correlation >= 0 ? t('scatter.positive') : t('scatter.negative')} {t('scatter.correlation').toLowerCase()}:
                  {' '}
                  {correlation >= 0
                    ? t('scatter.trendIncrease', { x: xColumn, y: yColumn })
                    : t('scatter.trendDecrease', { x: xColumn, y: yColumn })}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
