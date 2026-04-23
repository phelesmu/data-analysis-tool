import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarBlank, ArrowsOutLineHorizontal, X } from '@phosphor-icons/react'
import { format, differenceInDays, addDays } from 'date-fns'
import type { DataRow, ColumnInfo } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'

interface DateRangeSliderProps {
  data: DataRow[]
  columns: ColumnInfo[]
  onDateRangeChange: (column: string, startDate: Date | null, endDate: Date | null) => void
}

interface DateRange {
  min: Date
  max: Date
}

interface ColumnDateRange {
  column: string
  range: DateRange
  totalDays: number
}

export function DateRangeSlider({ data, columns, onDateRangeChange }: DateRangeSliderProps) {
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [sliderValues, setSliderValues] = useState<[number, number]>([0, 100])
  const [isActive, setIsActive] = useState(false)
  const { t, locale } = useLanguage()

  const dateColumns = useMemo(() => {
    return columns.filter(col => col.type === 'date')
  }, [columns])

  const dateRanges = useMemo(() => {
    const ranges: ColumnDateRange[] = []

    dateColumns.forEach(column => {
      const dates = data
        .map(row => row[column.name])
        .filter((val): val is string | number => val !== null)
        .map(val => new Date(val))
        .filter(date => !isNaN(date.getTime()))

      if (dates.length === 0) return

      const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime())
      const min = sortedDates[0]
      const max = sortedDates[sortedDates.length - 1]
      const totalDays = differenceInDays(max, min)

      ranges.push({
        column: column.name,
        range: { min, max },
        totalDays
      })
    })

    return ranges
  }, [data, dateColumns])

  useEffect(() => {
    if (dateRanges.length > 0 && !selectedColumn) {
      setSelectedColumn(dateRanges[0].column)
    }
  }, [dateRanges, selectedColumn])

  const currentRange = useMemo(() => {
    if (!selectedColumn) return null
    return dateRanges.find(r => r.column === selectedColumn) || null
  }, [selectedColumn, dateRanges])

  const selectedDates = useMemo(() => {
    if (!currentRange) return null

    const startDay = Math.round((sliderValues[0] / 100) * currentRange.totalDays)
    const endDay = Math.round((sliderValues[1] / 100) * currentRange.totalDays)

    const startDate = addDays(currentRange.range.min, startDay)
    const endDate = addDays(currentRange.range.min, endDay)

    return { startDate, endDate }
  }, [currentRange, sliderValues])

  useEffect(() => {
    if (isActive && selectedColumn && selectedDates) {
      onDateRangeChange(selectedColumn, selectedDates.startDate, selectedDates.endDate)
    } else if (!isActive) {
      onDateRangeChange('', null, null)
    }
  }, [isActive, selectedColumn, selectedDates, onDateRangeChange])

  const handleReset = () => {
    setSliderValues([0, 100])
    setIsActive(false)
  }

  const handleApply = () => {
    setIsActive(true)
  }

  const isDefaultRange = sliderValues[0] === 0 && sliderValues[1] === 100

  if (dateRanges.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarBlank size={20} weight="bold" />
              {t('dateRange.title')}
            </CardTitle>
            {isActive && (
              <Badge variant="default">{t('dateRange.active')}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleReset}
                className="text-destructive hover:text-destructive gap-1"
              >
                <X size={16} weight="bold" />
                {t('dateRange.clear')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('dateRange.selectColumn')}</label>
          <div className="flex flex-wrap gap-2">
            {dateRanges.map(({ column }) => (
              <Button
                key={column}
                variant={selectedColumn === column ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedColumn(column)
                  setSliderValues([0, 100])
                  setIsActive(false)
                }}
              >
                {column}
              </Button>
            ))}
          </div>
        </div>

        {currentRange && selectedDates && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ArrowsOutLineHorizontal size={16} weight="bold" className="text-muted-foreground" />
                  <span className="font-medium">{t('dateRange.range')}</span>
                </div>
                <span className="text-muted-foreground">
                  {t('dateRange.days', { count: differenceInDays(selectedDates.endDate, selectedDates.startDate) + 1 })}
                </span>
              </div>

              <div className="px-2 py-4">
                <Slider
                  value={sliderValues}
                  onValueChange={(values) => {
                    setSliderValues(values as [number, number])
                    if (isActive) {
                      setIsActive(false)
                    }
                  }}
                  min={0}
                  max={100}
                  step={1}
                  minStepsBetweenThumbs={0}
                  className="relative"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">{t('dateRange.startDate')}</label>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                    <CalendarBlank size={18} weight="bold" className="text-accent" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {format(selectedDates.startDate, 'PPP', { locale })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(selectedDates.startDate, 'EEEE', { locale })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">{t('dateRange.endDate')}</label>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                    <CalendarBlank size={18} weight="bold" className="text-accent" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {format(selectedDates.endDate, 'PPP', { locale })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(selectedDates.endDate, 'EEEE', { locale })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  {t('dateRange.dataset', {
                    start: format(currentRange.range.min, 'PPP', { locale }),
                    end: format(currentRange.range.max, 'PPP', { locale }),
                  })}
                </div>
              </div>
            </div>

            {!isActive && !isDefaultRange && (
              <Button 
                onClick={handleApply} 
                className="w-full gap-2"
              >
                <CalendarBlank size={18} weight="bold" />
                {t('dateRange.apply')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
