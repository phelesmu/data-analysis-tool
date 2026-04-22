import { useState, useMemo, useCallback } from 'react'
import { Toaster, toast } from 'sonner'
import { Table, ChartBar, Function, UploadSimple, ArrowsInLineVertical, Code, FunnelSimple } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/FileUpload'
import { DataTable } from '@/components/DataTable'
import { StatisticsCards } from '@/components/StatisticsCards'
import { DataVisualization } from '@/components/DataVisualization'
import { DataFilters } from '@/components/DataFilters'
import { DateRangeSlider } from '@/components/DateRangeSlider'
import { TimelineChart } from '@/components/TimelineChart'
import { CorrelationAnalysis } from '@/components/CorrelationAnalysis'
import { ScatterPlot } from '@/components/ScatterPlot'
import { SqlQueryPanel } from '@/components/SqlQueryPanel'
import { QueryResults } from '@/components/QueryResults'
import { JoinPanel } from '@/components/JoinPanel'
import { RelationshipDiagram } from '@/components/RelationshipDiagram'
import { GroupByPanel } from '@/components/GroupByPanel'
import { parseFile, calculateStatistics, applyFilters, applyDateRangeFilter, calculateCorrelationMatrix, getTopCorrelations, exportToCSV } from '@/lib/dataUtils'
import type { DataRow, ColumnInfo, Statistics, FilterConfig, CorrelationMatrix, CorrelationPair, JoinRelationship } from '@/lib/types'

interface QueryResult {
  id: string
  name: string
  data: DataRow[]
  columns: ColumnInfo[]
  timestamp: Date
}

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
  const [queryResults, setQueryResults] = useState<QueryResult[]>([])
  const [joinHistory, setJoinHistory] = useState<JoinRelationship[]>([])

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

  const correlationMatrix = useMemo(() => {
    return calculateCorrelationMatrix(filteredData, columns)
  }, [filteredData, columns])

  const topCorrelations = useMemo(() => {
    return getTopCorrelations(correlationMatrix, 10)
  }, [correlationMatrix])

  const activeFiltersCount = useMemo(() => {
    let count = filters.filter(f => {
      if (f.operator.startsWith('column')) {
        return !!f.compareToColumn
      }
      return f.value.trim() !== ''
    }).length
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

  const handleQueryResult = useCallback((resultData: DataRow[], resultColumns: ColumnInfo[], queryName: string, joinRelationship?: JoinRelationship) => {
    const newResult: QueryResult = {
      id: `query-${Date.now()}`,
      name: queryName,
      data: resultData,
      columns: resultColumns,
      timestamp: new Date()
    }
    
    setQueryResults(prev => [...prev, newResult])
    
    if (joinRelationship) {
      setJoinHistory(prev => [...prev, joinRelationship])
    }
    
    toast.success('Query executed successfully!', {
      description: `Generated ${resultData.length} rows × ${resultColumns.length} columns`
    })
  }, [])

  const handleRemoveResult = useCallback((id: string) => {
    setQueryResults(prev => prev.filter(r => r.id !== id))
    toast.info('Query result removed')
  }, [])

  const handleExportResult = useCallback((result: QueryResult) => {
    exportToCSV(result.data, `${result.name.replace(/[^\w\s]/gi, '_')}.csv`)
    toast.success('Export successful!', {
      description: `Exported ${result.data.length} rows`
    })
  }, [])

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
                activeFiltersCount={activeFiltersCount}
              />

              <DateRangeSlider
                data={data}
                columns={columns}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>

            <TimelineChart data={filteredData} columns={columns} />

            <Tabs defaultValue="table" className="w-full">
              <TabsList className="grid w-full max-w-2xl grid-cols-6">
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
                <TabsTrigger value="correlation" className="gap-2">
                  <ArrowsInLineVertical size={18} weight="bold" />
                  <span className="hidden sm:inline">Correlation</span>
                </TabsTrigger>
                <TabsTrigger value="groupby" className="gap-2">
                  <FunnelSimple size={18} weight="bold" />
                  <span className="hidden sm:inline">Group By</span>
                </TabsTrigger>
                <TabsTrigger value="sql" className="gap-2">
                  <Code size={18} weight="bold" />
                  <span className="hidden sm:inline">SQL</span>
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

              <TabsContent value="correlation" className="mt-6">
                <div className="space-y-6">
                  <CorrelationAnalysis 
                    correlationMatrix={correlationMatrix}
                    topCorrelations={topCorrelations}
                  />
                  
                  <ScatterPlot 
                    data={filteredData}
                    columns={columns}
                  />
                </div>
              </TabsContent>

              <TabsContent value="groupby" className="mt-6">
                <div className="space-y-6">
                  <GroupByPanel
                    data={filteredData}
                    columns={columns}
                    onGroupResult={handleQueryResult}
                  />
                  
                  <QueryResults
                    results={queryResults}
                    onRemoveResult={handleRemoveResult}
                    onExportResult={handleExportResult}
                  />
                </div>
              </TabsContent>

              <TabsContent value="sql" className="mt-6">
                <div className="space-y-6">
                  <SqlQueryPanel
                    data={filteredData}
                    columns={columns}
                    onQueryResult={handleQueryResult}
                  />
                  
                  <JoinPanel
                    queryResults={queryResults}
                    onJoinResult={handleQueryResult}
                  />
                  
                  <RelationshipDiagram
                    queryResults={queryResults}
                    joinHistory={joinHistory}
                  />
                  
                  <QueryResults
                    results={queryResults}
                    onRemoveResult={handleRemoveResult}
                    onExportResult={handleExportResult}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
