import { useState, useMemo, useCallback } from 'react'
import { Toaster, toast } from 'sonner'
import { Table, ChartBar, Function, UploadSimple } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/FileUpload'
import { DataTable } from '@/components/DataTable'
import { StatisticsCards } from '@/components/StatisticsCards'
import { DataVisualization } from '@/components/DataVisualization'
import { DataFilters } from '@/components/DataFilters'
import { DateRangeSlider } from '@/components/DateRangeSlider'
import { parseFile, calculateStatistics, applyFilters, applyDateRangeFilter } from '@/lib/dataUtils'
import type { DataRow, ColumnInfo, Statistics, FilterConfig } from '@/lib/types'

function App() {
  const [data, setData] = useState<DataRow[]>([])
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [statistics, setStatistics] = useState<Statistics[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string>('')
  const [filters, setFilters] = useState<FilterConfig[]>([])
  const [dateRangeColumn, setDateRangeColumn] = useState<string>('')
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null)
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null)

  const filteredData = useMemo(() => {
    let result = applyFilters(data, filters, columns)
    
    if (dateRangeColumn && dateRangeStart && dateRangeEnd) {
      result = applyDateRangeFilter(result, dateRangeColumn, dateRangeStart, dateRangeEnd)
    }
    
    return result
  }, [data, filters, columns, dateRangeColumn, dateRangeStart, dateRangeEnd])

  const filteredStatistics = useMemo(() => {
    return calculateStatistics(filteredData, columns)
  }, [filteredData, columns])

  const activeFiltersCount = useMemo(() => {
    let count = filters.filter(f => f.value.trim() !== '').length
    if (dateRangeColumn && dateRangeStart && dateRangeEnd) {
      count += 1
    }
    return count
  }, [filters, dateRangeColumn, dateRangeStart, dateRangeEnd])

  const handleFilterChange = useCallback((newFilters: FilterConfig[]) => {
    setFilters(newFilters)
  }, [])

  const handleDateRangeChange = useCallback((column: string, startDate: Date | null, endDate: Date | null) => {
    setDateRangeColumn(column)
    setDateRangeStart(startDate)
    setDateRangeEnd(endDate)
  }, [])

  const handleFileSelect = async (file: File) => {
    setIsLoading(true)
    setFileName(file.name)

    try {
      const result = await parseFile(file)
      setData(result.data)
      setColumns(result.columns)
      
      const stats = calculateStatistics(result.data, result.columns)
      setStatistics(stats)

      toast.success('File uploaded successfully!', {
        description: `Loaded ${result.data.length} rows and ${result.columns.length} columns`
      })
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Failed to process file'
      })
      setData([])
      setColumns([])
      setStatistics([])
      setFileName('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setData([])
    setColumns([])
    setStatistics([])
    setFileName('')
    setFilters([])
    setDateRangeColumn('')
    setDateRangeStart(null)
    setDateRangeEnd(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Data Analysis Tool
              </h1>
              <p className="text-muted-foreground">
                Upload your data and get instant insights
              </p>
            </div>
            {data.length > 0 && (
              <Button onClick={handleReset} variant="outline" size="lg">
                <UploadSimple size={20} weight="bold" className="mr-2" />
                Upload New File
              </Button>
            )}
          </div>
        </header>

        {data.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Current File:</span>
              <span>{fileName}</span>
              <span className="text-xs">•</span>
              <span>{data.length} rows</span>
              {activeFiltersCount > 0 && (
                <>
                  <span className="text-xs">•</span>
                  <span className="text-accent font-medium">{filteredData.length} filtered rows</span>
                </>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <DataFilters 
                columns={columns} 
                onFilterChange={handleFilterChange}
                activeFiltersCount={filters.filter(f => f.value.trim() !== '').length}
              />

              <DateRangeSlider
                data={data}
                columns={columns}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>

            <Tabs defaultValue="table" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="table" className="gap-2">
                  <Table size={18} weight="bold" />
                  <span className="hidden sm:inline">Table</span>
                </TabsTrigger>
                <TabsTrigger value="charts" className="gap-2">
                  <ChartBar size={18} weight="bold" />
                  <span className="hidden sm:inline">Charts</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="gap-2">
                  <Function size={18} weight="bold" />
                  <span className="hidden sm:inline">Statistics</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-6">
                <DataTable data={filteredData} columns={columns} />
              </TabsContent>

              <TabsContent value="charts" className="mt-6">
                <DataVisualization data={filteredData} columns={columns} />
              </TabsContent>

              <TabsContent value="stats" className="mt-6">
                <StatisticsCards statistics={filteredStatistics} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
