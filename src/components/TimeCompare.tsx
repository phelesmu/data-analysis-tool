import { useEffect, useMemo, useState } from 'react'
import { Clock, ArrowRight, Warning } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { exportToCSV, parseDateValue } from '@/lib/dataUtils'
import type { ColumnInfo, DataRow } from '@/lib/types'
import { DataSourceSelector, type DataSource } from '@/components/DataSourceSelector'
import { useLanguage } from '@/lib/i18n'

interface TimeCompareProps {
  sources: DataSource[]
  currentSourceId: string
  onSourceChange: (id: string) => void
}

type Order = 'before' | 'after' | 'equal' | 'missing'

interface RowResult {
  index: number
  rawA: string | number | null
  rawB: string | number | null
  ms: number | null
  order: Order
  rest: DataRow
}

function getOrderLabelMap(t: ReturnType<typeof useLanguage>['t']): Record<Order, { label: string; color: string }> {
  return {
    before: { label: t('timeCompare.before'), color: 'bg-emerald-500 text-white hover:bg-emerald-500' },
    after: { label: t('timeCompare.after'), color: 'bg-red-500 text-white hover:bg-red-500' },
    equal: { label: t('timeCompare.equal'), color: 'bg-slate-400 text-white hover:bg-slate-400' },
    missing: { label: t('timeCompare.missing'), color: 'bg-muted text-muted-foreground hover:bg-muted' },
  }
}

function parseTime(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = parseDateValue(value)
  return parsed ? parsed.date.getTime() : null
}

function formatDuration(ms: number): string {
  const sign = ms < 0 ? '-' : ''
  const abs = Math.abs(ms)
  const sec = Math.floor(abs / 1000)
  const day = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const parts: string[] = []
  if (day) parts.push(`${day}d`)
  if (h || day) parts.push(`${h}h`)
  if (m || h || day) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return sign + parts.join(' ')
}

function looksLikeDateColumn(c: ColumnInfo): boolean {
  return c.type === 'date' || /time|date|_at$|^at$/i.test(c.name)
}

export function TimeCompare({ sources, currentSourceId, onSourceChange }: TimeCompareProps) {
  const { t } = useLanguage()
  const orderLabelMap = getOrderLabelMap(t)
  const resolved = useMemo<DataSource | undefined>(
    () => sources.find(s => s.id === currentSourceId) ?? sources[0],
    [sources, currentSourceId],
  )

  const dateLikeColumns = useMemo(
    () => (resolved?.columns ?? []).filter(looksLikeDateColumn),
    [resolved],
  )

  const [colA, setColA] = useState<string>('')
  const [colB, setColB] = useState<string>('')

  // Auto-pick / re-pick columns when the dataset changes
  useEffect(() => {
    if (dateLikeColumns.length === 0) {
      setColA('')
      setColB('')
      return
    }
    setColA(prev => (dateLikeColumns.find(c => c.name === prev) ? prev : dateLikeColumns[0]?.name ?? ''))
    setColB(prev => (
      dateLikeColumns.find(c => c.name === prev)
        ? prev
        : (dateLikeColumns[1]?.name ?? dateLikeColumns[0]?.name ?? '')
    ))
  }, [resolved?.id, dateLikeColumns])

  const results: RowResult[] = useMemo(() => {
    if (!resolved || !colA || !colB) return []
    return resolved.data.map((row, i) => {
      const rawA = row[colA] ?? null
      const rawB = row[colB] ?? null
      const a = parseTime(rawA)
      const b = parseTime(rawB)
      let order: Order
      let ms: number | null = null
      if (a === null || b === null) {
        order = 'missing'
      } else {
        ms = b - a
        if (ms === 0) order = 'equal'
        else if (ms > 0) order = 'before'
        else order = 'after'
      }
      return { index: i + 1, rawA, rawB, ms, order, rest: row }
    })
  }, [resolved, colA, colB])

  const summary = useMemo(() => {
    const acc: Record<Order, number> = { before: 0, after: 0, equal: 0, missing: 0 }
    let totalMs = 0
    let counted = 0
    for (const r of results) {
      acc[r.order]++
      if (r.ms !== null) {
        totalMs += r.ms
        counted++
      }
    }
    const avg = counted > 0 ? totalMs / counted : null
    return { acc, avg, total: results.length }
  }, [results])

  const [filterOrder, setFilterOrder] = useState<Order | 'all'>('all')
  const filteredRows = useMemo(
    () => (filterOrder === 'all' ? results : results.filter(r => r.order === filterOrder)),
    [results, filterOrder],
  )

  const handleExport = () => {
    const exportRows = filteredRows.map(r => ({
      '#': r.index,
      [colA]: r.rawA,
      [colB]: r.rawB,
      'B - A (ms)': r.ms ?? '',
      'B - A (human)': r.ms === null ? '' : formatDuration(r.ms),
      Order: orderLabelMap[r.order].label,
    }))
    exportToCSV(exportRows as DataRow[], `time-compare-${colA}-vs-${colB}.csv`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock size={24} weight="bold" className="text-primary" />
            <CardTitle>{t('timeCompare.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('timeCompare.description')}
            {' '}
            {t('timeCompare.descriptionHint')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sources.length > 0 && (
            <DataSourceSelector
              sources={sources}
              currentSource={currentSourceId}
              onSourceChange={onSourceChange}
            />
          )}

          {dateLikeColumns.length < 2 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
              <Warning size={16} weight="bold" />
              {t('timeCompare.needColumns')} {t('timeCompare.detected')}:{' '}
              {dateLikeColumns.length === 0 ? t('common.none') : dateLikeColumns.map(c => c.name).join(', ')}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t('timeCompare.colA')}</p>
                  <Select value={colA} onValueChange={setColA}>
                    <SelectTrigger className="w-[220px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateLikeColumns.map(c => (
                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ArrowRight size={20} weight="bold" className="text-muted-foreground mb-2" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t('timeCompare.colB')}</p>
                  <Select value={colB} onValueChange={setColB}>
                    <SelectTrigger className="w-[220px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateLikeColumns.map(c => (
                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={filteredRows.length === 0}
                  >
                    {t('timeCompare.export')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label={t('timeCompare.before')} value={summary.acc.before} total={summary.total} color="text-emerald-600" />
                <SummaryCard label={t('timeCompare.after')} value={summary.acc.after} total={summary.total} color="text-red-600" />
                <SummaryCard label={t('timeCompare.equal')} value={summary.acc.equal} total={summary.total} color="text-slate-600" />
                <SummaryCard label={t('timeCompare.missing')} value={summary.acc.missing} total={summary.total} color="text-muted-foreground" />
              </div>

              {summary.avg !== null && (
                <div className="text-sm text-muted-foreground">
                  {t('timeCompare.averageDiff', { b: colB, a: colA })}:{' '}
                  <span className="font-mono text-foreground">{formatDuration(summary.avg)}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('timeCompare.filterRows')}:</span>
                {(['all', 'before', 'after', 'equal', 'missing'] as const).map(k => (
                  <Button
                    key={k}
                    size="sm"
                    variant={filterOrder === k ? 'default' : 'outline'}
                    onClick={() => setFilterOrder(k)}
                    className="h-7 px-2 text-xs"
                  >
                    {k === 'all' ? t('timeCompare.all') : orderLabelMap[k].label}
                  </Button>
                ))}
              </div>

              <div className="rounded-lg border overflow-hidden">
                <ScrollArea className="h-[420px]">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        <TableHead className="w-[64px] text-center">#</TableHead>
                        <TableHead>{colA}</TableHead>
                        <TableHead>{colB}</TableHead>
                        <TableHead className="text-right">{t('timeCompare.delta')}</TableHead>
                        <TableHead>{t('timeCompare.order')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.slice(0, 1000).map(r => (
                        <TableRow key={r.index}>
                          <TableCell className="text-center text-muted-foreground font-mono text-xs">{r.index}</TableCell>
                          <TableCell className="font-mono text-xs">{r.rawA === null ? '—' : String(r.rawA)}</TableCell>
                          <TableCell className="font-mono text-xs">{r.rawB === null ? '—' : String(r.rawB)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {r.ms === null ? '—' : formatDuration(r.ms)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${orderLabelMap[r.order].color} text-xs`}>{orderLabelMap[r.order].label}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                {filteredRows.length > 1000 && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted/40 border-t">
                    {t('timeCompare.showingFirst', { count: filteredRows.length })}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const { t } = useLanguage()
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
  return (
    <div className="rounded-md border p-3 bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold font-mono tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{t('timeCompare.percentOfTotal', { pct, total })}</p>
    </div>
  )
}
