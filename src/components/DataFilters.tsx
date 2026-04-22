import { useState, useEffect } from 'react'
import { Funnel, X, Plus, CaretDown, CalendarBlank, Columns } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import type { DataRow, ColumnInfo, FilterConfig } from '@/lib/types'

interface DataFiltersProps {
  columns: ColumnInfo[]
  onFilterChange: (filters: FilterConfig[]) => void
  activeFiltersCount: number
}

export function DataFilters({ columns, onFilterChange, activeFiltersCount }: DataFiltersProps) {
  const [filters, setFilters] = useState<FilterConfig[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    onFilterChange(filters)
  }, [filters])

  const addFilter = () => {
    const newFilter: FilterConfig = {
      id: Date.now().toString(),
      column: columns[0]?.name || '',
      operator: 'equals',
      value: ''
    }
    setFilters([...filters, newFilter])
    setIsOpen(true)
  }

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id))
  }

  const updateFilter = (id: string, updates: Partial<FilterConfig>) => {
    setFilters(filters.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const clearAllFilters = () => {
    setFilters([])
  }

  const getOperatorsForColumn = (columnName: string) => {
    const column = columns.find(c => c.name === columnName)
    if (!column) return []

    const commonCompareOps = [
      { value: 'columnEquals', label: '= Column' },
      { value: 'columnNotEquals', label: '≠ Column' }
    ]

    if (column.type === 'date') {
      return [
        { value: 'equals', label: 'On Date' },
        { value: 'notEquals', label: 'Not On Date' },
        { value: 'after', label: 'After' },
        { value: 'before', label: 'Before' },
        { value: 'onOrAfter', label: 'On or After' },
        { value: 'onOrBefore', label: 'On or Before' },
        { value: 'between', label: 'Between' },
        ...commonCompareOps,
        { value: 'columnAfter', label: '> Column' },
        { value: 'columnBefore', label: '< Column' }
      ]
    } else if (column.type === 'numeric') {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'greaterThan', label: 'Greater Than' },
        { value: 'lessThan', label: 'Less Than' },
        { value: 'greaterThanOrEqual', label: 'Greater Than or Equal' },
        { value: 'lessThanOrEqual', label: 'Less Than or Equal' },
        { value: 'between', label: 'Between' },
        ...commonCompareOps,
        { value: 'columnGreaterThan', label: '> Column' },
        { value: 'columnLessThan', label: '< Column' },
        { value: 'columnGreaterThanOrEqual', label: '≥ Column' },
        { value: 'columnLessThanOrEqual', label: '≤ Column' }
      ]
    } else {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'notContains', label: 'Does Not Contain' },
        { value: 'startsWith', label: 'Starts With' },
        { value: 'endsWith', label: 'Ends With' },
        ...commonCompareOps,
        { value: 'columnContains', label: 'Contains Column' },
        { value: 'columnIn', label: 'Exists in Column' }
      ]
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Funnel size={20} weight="bold" />
                Filters
              </CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="default">{activeFiltersCount} active</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {filters.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-destructive hover:text-destructive"
                >
                  Clear All
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <CaretDown 
                    size={16} 
                    weight="bold"
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {filters.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="mb-3">No filters applied</p>
                <Button onClick={addFilter} variant="outline" size="sm" className="gap-2">
                  <Plus size={16} weight="bold" />
                  Add Filter
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filters.map((filter) => {
                  const column = columns.find(c => c.name === filter.column)
                  const operators = getOperatorsForColumn(filter.column)
                  const isBetween = filter.operator === 'between'
                  const isColumnCompare = filter.operator.startsWith('column')

                  return (
                    <div key={filter.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor={`column-${filter.id}`} className="text-xs mb-1">Column</Label>
                            <TooltipProvider>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <Select
                                    value={filter.column}
                                    onValueChange={(value) => updateFilter(filter.id, { 
                                      column: value,
                                      operator: 'equals',
                                      value: '',
                                      valueTo: undefined,
                                      compareToColumn: undefined
                                    })}
                                  >
                                    <SelectTrigger id={`column-${filter.id}`} className="max-w-full">
                                      <SelectValue className="truncate" />
                                    </SelectTrigger>
                                    <SelectContent className="max-w-xs">
                                      {columns.map((col) => (
                                        <SelectItem key={col.name} value={col.name}>
                                          <TooltipProvider>
                                            <Tooltip delayDuration={500}>
                                              <TooltipTrigger asChild>
                                                <span className="block max-w-[250px] truncate">{col.name}</span>
                                              </TooltipTrigger>
                                              <TooltipContent side="right">
                                                <p className="max-w-xs break-words">{col.name}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="max-w-xs break-words">{filter.column}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          <div>
                            <Label htmlFor={`operator-${filter.id}`} className="text-xs mb-1">Operator</Label>
                            <Select
                              value={filter.operator}
                              onValueChange={(value) => updateFilter(filter.id, { 
                                operator: value,
                                valueTo: value === 'between' ? filter.valueTo : undefined,
                                compareToColumn: value.startsWith('column') ? (filter.compareToColumn || columns[0]?.name) : undefined
                              })}
                            >
                              <SelectTrigger id={`operator-${filter.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor={`value-${filter.id}`} className="text-xs mb-1 flex items-center gap-1">
                              {isBetween ? 'From' : isColumnCompare ? 'Compare Column' : 'Value'}
                              {isColumnCompare && <Columns size={14} weight="bold" className="text-accent" />}
                            </Label>
                            {isColumnCompare ? (
                              <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                  <TooltipTrigger asChild>
                                    <Select
                                      value={filter.compareToColumn || columns[0]?.name}
                                      onValueChange={(value) => updateFilter(filter.id, { compareToColumn: value })}
                                    >
                                      <SelectTrigger id={`value-${filter.id}`} className="max-w-full">
                                        <SelectValue className="truncate" />
                                      </SelectTrigger>
                                      <SelectContent className="max-w-xs">
                                        {columns.filter(c => c.name !== filter.column).map((col) => (
                                          <SelectItem key={col.name} value={col.name}>
                                            <TooltipProvider>
                                              <Tooltip delayDuration={500}>
                                                <TooltipTrigger asChild>
                                                  <span className="block max-w-[250px] truncate">{col.name}</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                  <p className="max-w-xs break-words">{col.name}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="max-w-xs break-words">{filter.compareToColumn || columns[0]?.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : column?.type === 'date' ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                  >
                                    <CalendarBlank size={16} weight="bold" className="mr-2" />
                                    {filter.value ? format(new Date(filter.value), 'PPP') : 'Select date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={filter.value ? new Date(filter.value) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        updateFilter(filter.id, { value: format(date, 'yyyy-MM-dd') })
                                      }
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <Input
                                id={`value-${filter.id}`}
                                type={column?.type === 'numeric' ? 'number' : 'text'}
                                value={filter.value}
                                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                placeholder={column?.type === 'numeric' ? '0' : 'Enter value'}
                              />
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFilter(filter.id)}
                          className="mt-5 text-destructive hover:text-destructive"
                        >
                          <X size={18} weight="bold" />
                        </Button>
                      </div>

                      {isBetween && !isColumnCompare && (
                        <div className="pl-0 sm:pl-[calc(66.666%+0.5rem)]">
                          <Label htmlFor={`valueTo-${filter.id}`} className="text-xs mb-1">To</Label>
                          {column?.type === 'date' ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  <CalendarBlank size={16} weight="bold" className="mr-2" />
                                  {filter.valueTo ? format(new Date(filter.valueTo), 'PPP') : 'Select date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={filter.valueTo ? new Date(filter.valueTo) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      updateFilter(filter.id, { valueTo: format(date, 'yyyy-MM-dd') })
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <Input
                              id={`valueTo-${filter.id}`}
                              type={column?.type === 'numeric' ? 'number' : 'text'}
                              value={filter.valueTo || ''}
                              onChange={(e) => updateFilter(filter.id, { valueTo: e.target.value })}
                              placeholder={column?.type === 'numeric' ? '0' : 'Enter value'}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                <Button onClick={addFilter} variant="outline" size="sm" className="w-full gap-2">
                  <Plus size={16} weight="bold" />
                  Add Another Filter
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
