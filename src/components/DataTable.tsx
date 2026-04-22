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

interface DataTableProps {
  data: DataRow[]
  columns: ColumnInfo[]
}

export function DataTable({ data, columns }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [visibleColumns, setVisibleColumns] = useKV<string[]>('data-table-visible-columns', [])

  useEffect(() => {
    if (columns.length > 0 && (!visibleColumns || visibleColumns.length === 0)) {
      setVisibleColumns(columns.map(c => c.name))
    }
  }, [columns, visibleColumns, setVisibleColumns])

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

  const toggleColumn = (columnName: string) => {
    setVisibleColumns((current) => {
      if (!current) return [columnName]
      if (current.includes(columnName)) {
        return current.filter(name => name !== columnName)
      } else {
        return [...current, columnName]
      }
    })
  }

  const toggleAllColumns = () => {
    setVisibleColumns((current) => {
      if (!current || current.length === columns.length) {
        return []
      } else {
        return columns.map(c => c.name)
      }
    })
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

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Data Preview</h3>
          <Badge variant="secondary">{data.length} rows</Badge>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns size={16} weight="bold" />
              Columns ({visibleCount}/{columns.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
            <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={allSelected}
              onCheckedChange={toggleAllColumns}
              className="font-semibold"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
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
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  {displayColumns.map((column, columnIndex) => (
                    <TableHead 
                      key={column.name}
                      className={`cursor-pointer hover:bg-muted/50 transition-colors min-w-[120px] ${
                        columnIndex === 0 ? 'bg-accent/30 border-r-2 border-accent' : ''
                      }`}
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
                {sortedData.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-muted/30">
                    {displayColumns.map((column, columnIndex) => (
                      <TableCell 
                        key={`${rowIndex}-${column.name}`}
                        className={`${column.type === 'numeric' ? 'font-mono tabular-nums' : ''} ${
                          columnIndex === 0 ? 'bg-accent/5 border-r-2 border-accent/30' : ''
                        }`}
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
    </div>
  )
}
