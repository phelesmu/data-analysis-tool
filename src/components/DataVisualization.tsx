import { useState } from 'react'
import { ChartBar, ChartLine, ChartPie } from '@phosphor-icons/react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DataRow, ColumnInfo, ChartType } from '@/lib/types'

interface DataVisualizationProps {
  data: DataRow[]
  columns: ColumnInfo[]
}

const COLORS = ['oklch(0.35 0.15 265)', 'oklch(0.7 0.15 195)', 'oklch(0.75 0.18 150)', 'oklch(0.8 0.15 60)', 'oklch(0.65 0.2 30)']

export function DataVisualization({ data, columns }: DataVisualizationProps) {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [selectedColumn, setSelectedColumn] = useState<string>(
    columns.find(c => c.type === 'numeric')?.name || columns[0]?.name || ''
  )

  const numericColumns = columns.filter(c => c.type === 'numeric')

  if (numericColumns.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No numeric columns available for visualization</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.slice(0, 20).map((row, index) => ({
    name: row[columns[0].name] ? String(row[columns[0].name]) : `Row ${index + 1}`,
    value: typeof row[selectedColumn] === 'number' ? row[selectedColumn] : 0
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">Data Visualization</h3>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedColumn} onValueChange={setSelectedColumn}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {numericColumns.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 bg-muted rounded-lg p-1">
            <Button
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="gap-2"
            >
              <ChartBar size={18} weight="bold" />
              <span className="hidden sm:inline">Bar</span>
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('line')}
              className="gap-2"
            >
              <ChartLine size={18} weight="bold" />
              <span className="hidden sm:inline">Line</span>
            </Button>
            <Button
              variant={chartType === 'pie' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('pie')}
              className="gap-2"
            >
              <ChartPie size={18} weight="bold" />
              <span className="hidden sm:inline">Pie</span>
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{selectedColumn}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' && (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 265)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="oklch(0.5 0.01 265)"
                    tick={{ fill: 'oklch(0.5 0.01 265)', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="oklch(0.5 0.01 265)"
                    tick={{ fill: 'oklch(0.5 0.01 265)', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'oklch(1 0 0)', 
                      border: '1px solid oklch(0.88 0.01 265)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="value" fill="oklch(0.35 0.15 265)" name={selectedColumn} />
                </BarChart>
              )}

              {chartType === 'line' && (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 265)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="oklch(0.5 0.01 265)"
                    tick={{ fill: 'oklch(0.5 0.01 265)', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="oklch(0.5 0.01 265)"
                    tick={{ fill: 'oklch(0.5 0.01 265)', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'oklch(1 0 0)', 
                      border: '1px solid oklch(0.88 0.01 265)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="oklch(0.7 0.15 195)" 
                    strokeWidth={3}
                    name={selectedColumn}
                  />
                </LineChart>
              )}

              {chartType === 'pie' && (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={120}
                    fill="oklch(0.35 0.15 265)"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'oklch(1 0 0)', 
                      border: '1px solid oklch(0.88 0.01 265)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
          {chartData.length >= 20 && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Showing first 20 rows for visualization
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
