import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartLine, CalendarBlank, TrendUp } from '@phosphor-icons/react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { format, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, differenceInDays } from 'date-fns'
import type { DataRow, ColumnInfo } from '@/lib/types'

interface TimelineChartProps {
  data: DataRow[]
  columns: ColumnInfo[]
}

interface TimelineBucket {
  date: string
  count: number
  cumulative: number
  displayDate: string
  timestamp: number
}

type Granularity = 'day' | 'week' | 'month'

export function TimelineChart({ data, columns }: TimelineChartProps) {
  const [showCumulative, setShowCumulative] = useState(true)
  
  const dateColumns = useMemo(() => {
    return columns.filter(col => col.type === 'date')
  }, [columns])

  const timelineData = useMemo(() => {
    if (dateColumns.length === 0 || data.length === 0) return null

    const primaryDateColumn = dateColumns[0].name
    
    const dates = data
      .map(row => row[primaryDateColumn])
      .filter((val): val is string | number => val !== null)
      .map(val => new Date(val))
      .filter(date => !isNaN(date.getTime()))
      .map(date => startOfDay(date))

    if (dates.length === 0) return null

    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime())
    const minDate = sortedDates[0]
    const maxDate = sortedDates[sortedDates.length - 1]
    const daysDiff = differenceInDays(maxDate, minDate)

    let granularity: Granularity = 'day'
    let intervals: Date[]

    if (daysDiff > 365) {
      granularity = 'month'
      intervals = eachMonthOfInterval({ start: minDate, end: maxDate })
    } else if (daysDiff > 60) {
      granularity = 'week'
      intervals = eachWeekOfInterval({ start: minDate, end: maxDate })
    } else {
      granularity = 'day'
      intervals = eachDayOfInterval({ start: minDate, end: maxDate })
    }

    const buckets = new Map<string, number>()
    
    intervals.forEach(interval => {
      const key = interval.toISOString()
      buckets.set(key, 0)
    })

    sortedDates.forEach(date => {
      let bucketDate: Date
      if (granularity === 'month') {
        bucketDate = new Date(date.getFullYear(), date.getMonth(), 1)
      } else if (granularity === 'week') {
        const dayOfWeek = date.getDay()
        const diff = date.getDate() - dayOfWeek
        bucketDate = new Date(date.getFullYear(), date.getMonth(), diff)
      } else {
        bucketDate = date
      }
      
      const key = startOfDay(bucketDate).toISOString()
      buckets.set(key, (buckets.get(key) || 0) + 1)
    })

    const sortedBuckets = Array.from(buckets.entries())
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())

    let cumulativeSum = 0
    const chartData: TimelineBucket[] = sortedBuckets.map(([dateStr, count]) => {
      const date = new Date(dateStr)
      let displayFormat = 'MMM d'
      
      if (granularity === 'month') {
        displayFormat = 'MMM yyyy'
      } else if (granularity === 'week') {
        displayFormat = 'MMM d'
      }
      
      cumulativeSum += count
      
      return {
        date: dateStr,
        count,
        cumulative: cumulativeSum,
        displayDate: format(date, displayFormat),
        timestamp: date.getTime()
      }
    })

    const maxCount = Math.max(...chartData.map(d => d.count))
    const totalRecords = sortedDates.length

    return {
      data: chartData,
      granularity,
      column: primaryDateColumn,
      maxCount,
      totalRecords,
      dateRange: {
        start: minDate,
        end: maxDate
      }
    }
  }, [data, dateColumns])

  if (!timelineData) {
    return null
  }

  const getBarColor = (count: number) => {
    const ratio = count / timelineData.maxCount
    if (ratio > 0.7) return 'hsl(var(--accent))'
    if (ratio > 0.4) return 'hsl(var(--primary))'
    return 'hsl(var(--muted-foreground) / 0.5)'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ChartLine size={20} weight="bold" />
              Timeline Distribution
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <CalendarBlank size={14} weight="bold" />
              {timelineData.column}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Granularity:</span>
              <Badge variant="secondary" className="capitalize">
                {timelineData.granularity}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Records:</span>
              <span className="font-semibold text-foreground">
                {timelineData.totalRecords.toLocaleString()}
              </span>
            </div>
            <Button 
              variant={showCumulative ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCumulative(!showCumulative)}
              className="gap-2"
            >
              <TrendUp size={16} weight="bold" />
              Cumulative Trend
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={timelineData.data}
                margin={{ top: 10, right: 30, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  stroke="hsl(var(--border))"
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  stroke="hsl(var(--border))"
                  allowDecimals={false}
                  label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                {showCumulative && (
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    stroke="hsl(var(--border))"
                    allowDecimals={false}
                    label={{ value: 'Cumulative', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                )}
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--popover-foreground))',
                    fontWeight: 600,
                    marginBottom: '4px'
                  }}
                  cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                />
                <Legend 
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ paddingBottom: '10px' }}
                  iconType="line"
                />
                <Bar 
                  yAxisId="left"
                  dataKey="count" 
                  name="Records"
                  radius={[4, 4, 0, 0]}
                >
                  {timelineData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.count)} />
                  ))}
                </Bar>
                {showCumulative && (
                  <Line 
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative Total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--accent))' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <CalendarBlank size={14} weight="bold" />
              <span>
                {format(timelineData.dateRange.start, 'MMM d, yyyy')} - {format(timelineData.dateRange.end, 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-accent" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-muted-foreground/50" />
                <span>Low</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
