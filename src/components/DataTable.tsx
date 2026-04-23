import { useState, useMemo, useEffect } from 'react'
import { useLocalStorageState as useKV } from '@/hooks/useLocalStorageState'
import { SortAscending, SortDescending, Columns } from '@phosphor-icons/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import type { DataRow, ColumnInfo } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'

interface DataTableProps {
  sourceId: string
  data: DataRow[]
  columns: ColumnInfo[]
  onVisibleColumnsChange?: (sourceId: string, visibleColumnNames: string[]) => void
}

const TABLE_PREVIEW_LIMIT = 500

export function DataTable({ sourceId, data, columns, onVisibleColumnsChange }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [previewLimit, setPreviewLimit] = useState<number | 'all'>(TABLE_PREVIEW_LIMIT)
  const storageKey = `data-table-visible-columns:${sourceId}`
  const [visibleColumns, setVisibleColumns] = useKV<string[]>(storageKey, [])
  const { t } = useLanguage()

  useEffect(() => {
    const hasStoredValue = typeof window !== 'undefined' && window.localStorage.getItem(storageKey) !== null
    if (columns.length > 0 && !hasStoredValue && (!visibleColumns || visibleColumns.length === 0)) {
      setVisibleColumns(columns.map(c => c.name))
    }
  }, [columns, visibleColumns, setVisibleColumns, storageKey])

  const columnNames = useMemo(() => columns.map(c => c.name), [columns])

  useEffect(() => {
    if (columnNames.length > 0 && visibleColumns) {
      setVisibleColumns((current) => {
        if (!current) return columnNames
        const validColumns = current.filter(name => columnNames.includes(name))
        const newColumns = columnNames.filter(name => !current.includes(name))
        return [...validColumns, ...newColumns]
      })
    }
  }, [columnNames, setVisibleColumns, visibleColumns])

  const displayColumns = useMemo(() => {
    if (!visibleColumns) return columns
    return columns.filter(col => visibleColumns.includes(col.name))
  }, [columns, visibleColumns])

  useEffect(() => {
    setPreviewLimit(TABLE_PREVIEW_LIMIT)
  }, [sourceId, data.length])

  const toggleColumn = (columnName: string) => {
    const currentColumns = visibleColumns ?? columns.map(column => column.name)
    const nextColumns = currentColumns.includes(columnName)
      ? currentColumns.filter(name => name !== columnName)
      : [...currentColumns, columnName]

    setVisibleColumns(nextColumns)
    onVisibleColumnsChange?.(sourceId, nextColumns)
  }

  const toggleAllColumns = () => {
    const nextColumns =
      !visibleColumns || visibleColumns.length === columns.length
        ? []
        : columns.map(c => c.name)

    setVisibleColumns(nextColumns)
    onVisibleColumnsChange?.(sourceId, nextColumns)
  }

  const visibleCount = visibleColumns?.length || 0
  const allSelected = visibleCount === columns.length

  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnName)
      setSortDirection('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortColumn) return data

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal)
      const bStr = String(bVal)
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })
  }, [data, sortColumn, sortDirection])

  const previewRows = useMemo(
    () => previewLimit === 'all' ? sortedData : sortedData.slice(0, previewLimit),
    [previewLimit, sortedData]
  )

  const isPreviewLimited = sortedData.length > TABLE_PREVIEW_LIMIT
  const canLoadMore = previewLimit !== 'all' && previewRows.length < sortedData.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{t('dataTable.title')}</h3>
          <Badge variant="secondary">{t('dataTable.rows', { count: data.length.toLocaleString() })}</Badge>
          {isPreviewLimited && (
            <Badge variant="outline">
              {t('dataTable.showingFirst', { count: previewRows.length.toLocaleString() })}
            </Badge>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns size={16} weight="bold" />
              {t('dataTable.columnsButton', { visible: visibleCount, total: columns.length })}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
            <DropdownMenuLabel>{t('dataTable.showHideColumns')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={allSelected}
              onCheckedChange={toggleAllColumns}
              className="font-semibold"
            >
              {allSelected ? t('dataTable.deselectAll') : t('dataTable.selectAll')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.name}
                checked={visibleColumns?.includes(column.name)}
                onCheckedChange={() => toggleColumn(column.name)}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="truncate flex-1">{column.name}</span>
                  <Badge 
                    variant={column.type === 'numeric' ? 'default' : column.type === 'date' ? 'outline' : 'secondary'} 
                    className="text-xs shrink-0"
                  >
                    {column.type === 'numeric' ? '123' : column.type === 'date' ? '📅' : 'ABC'}
                  </Badge>
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <ScrollArea className="h-[500px]">
          <div className="min-w-max">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-card shadow-[0_1px_0_0_var(--border)]">
                <TableRow>
                  <TableHead
                    className="sticky left-0 z-30 bg-accent/40 border-r-2 border-accent text-center font-semibold w-[64px] min-w-[64px]"
                  >
                    #
                  </TableHead>
                  {displayColumns.map((column) => (
                    <TableHead 
                      key={column.name}
                      className="cursor-pointer hover:bg-muted/50 transition-colors min-w-[120px] bg-card"
                      onClick={() => handleSort(column.name)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{column.name}</span>
                        <Badge variant={column.type === 'numeric' ? 'default' : column.type === 'date' ? 'outline' : 'secondary'} className="text-xs">
                          {column.type === 'numeric' ? '123' : column.type === 'date' ? '📅' : 'ABC'}
                        </Badge>
                        {sortColumn === column.name && (
                          sortDirection === 'asc' 
                            ? <SortAscending size={16} weight="bold" />
                            : <SortDescending size={16} weight="bold" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayColumns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={Math.max(columns.length + 1, 2)} className="text-center text-muted-foreground py-10">
                      {t('dataTable.noColumnsSelected')}
                    </TableCell>
                  </TableRow>
                )}
                {previewRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-muted/30">
                    <TableCell
                      className="sticky left-0 z-10 bg-accent/10 border-r-2 border-accent/30 text-center font-mono tabular-nums text-xs text-muted-foreground w-[64px] min-w-[64px]"
                    >
                      {rowIndex + 1}
                    </TableCell>
                    {displayColumns.map((column) => (
                      <TableCell 
                        key={`${rowIndex}-${column.name}`}
                        className={column.type === 'numeric' ? 'font-mono tabular-nums' : ''}
                      >
                        {row[column.name] !== null ? String(row[column.name]) : '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      {isPreviewLimited && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t('dataTable.previewNote', { count: TABLE_PREVIEW_LIMIT.toLocaleString() })}
          </p>
          <div className="flex flex-wrap gap-2">
            {canLoadMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (typeof previewLimit !== 'number') return
                  setPreviewLimit(Math.min(previewLimit + TABLE_PREVIEW_LIMIT, sortedData.length))
                }}
              >
                {t('dataTable.loadMore', {
                  count: Math.min(TABLE_PREVIEW_LIMIT, sortedData.length - previewRows.length).toLocaleString(),
                })}
              </Button>
            )}
            {previewLimit !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setPreviewLimit('all')}>
                {t('dataTable.showAll')}
              </Button>
            )}
            {previewLimit === 'all' && isPreviewLimited && (
              <Button variant="outline" size="sm" onClick={() => setPreviewLimit(TABLE_PREVIEW_LIMIT)}>
                {t('dataTable.showLess')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
