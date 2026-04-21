import { useState } from 'react'
import { SortAscending, SortDescending } from '@phosphor-icons/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { DataRow, ColumnInfo } from '@/lib/types'

interface DataTableProps {
  data: DataRow[]
  columns: ColumnInfo[]
}

export function DataTable({ data, columns }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

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
      </div>

      <ScrollArea className="h-[500px] rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.name}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort(column.name)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{column.name}</span>
                    <Badge variant={column.type === 'numeric' ? 'default' : 'outline'} className="text-xs">
                      {column.type === 'numeric' ? '123' : 'ABC'}
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
                {columns.map((column) => (
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
      </ScrollArea>
    </div>
  )
}
