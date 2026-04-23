import { useState, useMemo, useCallback, useRef } from 'react'
import { Toaster, toast } from 'sonner'
import { Table, ChartBar, Function, UploadSimple, ArrowsInLineVertical, Code, FunnelSimple, Clock, Plus, X, DownloadSimple, Globe } from '@phosphor-icons/react'
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
import { AggregatedBarChart } from '@/components/AggregatedBarChart'
import { DataSourceSelector, type DataSource } from '@/components/DataSourceSelector'
import { TimeCompare } from '@/components/TimeCompare'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocalStorageState } from '@/hooks/useLocalStorageState'
import { LanguageProvider, useLanguage, type Language } from '@/lib/i18n'
import { parseFile, calculateStatistics, applyFilters, applyDateRangeFilter, calculateCorrelationMatrix, getTopCorrelations, exportToCSV } from '@/lib/dataUtils'
import type { DataRow, ColumnInfo, FilterConfig, CorrelationMatrix, CorrelationPair, JoinRelationship } from '@/lib/types'

interface QueryResult {
  id: string
  name: string
  data: DataRow[]
  columns: ColumnInfo[]
  timestamp: Date
}

function AppContent() {
  const [data, setData] = useState<DataRow[]>([])
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string>('')
  const [filters, setFilters] = useState<FilterConfig[]>([])
  const [dateRangeColumn, setDateRangeColumn] = useState<string>('')
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null)
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null)
  const [queryResults, setQueryResults] = useState<QueryResult[]>([])
  const [joinHistory, setJoinHistory] = useState<JoinRelationship[]>([])
  const [extraDatasets, setExtraDatasets] = useState<{ id: string; name: string; data: DataRow[]; columns: ColumnInfo[] }[]>([])
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>('main')
  const [activeTab, setActiveTab] = useState('table')
  const [previewColumnSelections, setPreviewColumnSelections] = useState<Record<string, string[]>>({})
  const extraFileInputRef = useRef<HTMLInputElement | null>(null)
  const { t, language, setLanguage } = useLanguage()

  const filteredData = useMemo(() => {
    let result = applyFilters(data, filters, columns)
    
    if (dateRangeColumn && dateRangeStart && dateRangeEnd) {
      result = applyDateRangeFilter(result, dateRangeColumn, dateRangeStart, dateRangeEnd)
    }
    
    return result
  }, [data, filters, columns, dateRangeColumn, dateRangeStart, dateRangeEnd])

  const projectRowsToColumns = useCallback((rows: DataRow[], selectedColumns: string[]): DataRow[] => {
    return rows.map((row) => {
      const nextRow: DataRow = {}
      selectedColumns.forEach((columnName) => {
        nextRow[columnName] = row[columnName] ?? null
      })
      return nextRow
    })
  }, [])

  const baseDataSources = useMemo<DataSource[]>(() => {
    const sources: DataSource[] = []

    if (data.length > 0) {
      sources.push({
        id: 'main',
        name: `Main: ${fileName} (filtered)`,
        data: filteredData,
        columns: columns,
        kind: 'base',
      })
      sources.push({
        id: 'main-raw',
        name: `Main: ${fileName} (raw)`,
        data: data,
        columns: columns,
        kind: 'base',
      })
    }

    extraDatasets.forEach((d) => {
      sources.push({ id: d.id, name: `File: ${d.name}`, data: d.data, columns: d.columns, kind: 'base' })
    })

    queryResults.forEach((result) => {
      sources.push({
        id: result.id,
        name: `Query: ${result.name}`,
        data: result.data,
        columns: result.columns,
        kind: 'base',
      })
    })

    return sources
  }, [data, fileName, filteredData, columns, extraDatasets, queryResults])

  const projectedDataSources = useMemo<DataSource[]>(() => {
    return baseDataSources.flatMap((source) => {
      const selectedColumns = previewColumnSelections[source.id]
      if (!selectedColumns || selectedColumns.length === 0 || selectedColumns.length === source.columns.length) {
        return []
      }

      const projectedColumns = source.columns.filter((column) => selectedColumns.includes(column.name))
      if (projectedColumns.length === 0) {
        return []
      }

      return [{
        id: `projection-${source.id}`,
        name: `${source.name} (selected columns)`,
        data: projectRowsToColumns(source.data, projectedColumns.map(column => column.name)),
        columns: projectedColumns,
        baseSourceId: source.id,
        kind: 'projection',
      }]
    })
  }, [baseDataSources, previewColumnSelections, projectRowsToColumns])

  const dataSources = useMemo<DataSource[]>(() => {
    return [...baseDataSources, ...projectedDataSources]
  }, [baseDataSources, projectedDataSources])

  const selectedDataSource = useMemo(() => {
    return dataSources.find(s => s.id === selectedDataSourceId) || dataSources[0]
  }, [dataSources, selectedDataSourceId])

  const filteredStatistics = useMemo(() => {
    if (activeTab !== 'stats' || !selectedDataSource) return []
    return calculateStatistics(selectedDataSource.data, selectedDataSource.columns)
  }, [activeTab, selectedDataSource])

  const correlationMatrix = useMemo(() => {
    if (activeTab !== 'correlation' || !selectedDataSource) return { columns: [], matrix: [] }
    return calculateCorrelationMatrix(selectedDataSource.data, selectedDataSource.columns)
  }, [activeTab, selectedDataSource])

  const topCorrelations = useMemo(() => {
    if (activeTab !== 'correlation') return []
    return getTopCorrelations(correlationMatrix, 10)
  }, [activeTab, correlationMatrix])

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

  const handleVisibleColumnsChange = useCallback((sourceId: string, visibleColumnNames: string[]) => {
    const currentSource = dataSources.find(source => source.id === sourceId)
    if (!currentSource) return

    const baseSourceId = currentSource.baseSourceId || currentSource.id
    const baseSource = baseDataSources.find(source => source.id === baseSourceId)
    if (!baseSource) return

    const normalizedColumns = baseSource.columns
      .map(column => column.name)
      .filter(columnName => visibleColumnNames.includes(columnName))

    setPreviewColumnSelections((prev) => {
      const next = { ...prev }

      if (normalizedColumns.length === 0 || normalizedColumns.length === baseSource.columns.length) {
        delete next[baseSourceId]
      } else {
        next[baseSourceId] = normalizedColumns
      }

      return next
    })

    if (normalizedColumns.length > 0 && normalizedColumns.length < baseSource.columns.length) {
      setSelectedDataSourceId(`projection-${baseSourceId}`)
      return
    }

    if (selectedDataSourceId === `projection-${baseSourceId}`) {
      setSelectedDataSourceId(baseSourceId)
    }
  }, [baseDataSources, dataSources, selectedDataSourceId])

  const handleFileSelect = async (file: File) => {
    setIsLoading(true)
    setFileName(file.name)

    let toastId: string | number | undefined

    if (file.size > 5 * 1024 * 1024) {
      toastId = toast.loading(t('app.processingFile'), {
        description: t('app.processingFileDesc')
      })
    }

    try {
      const result = await parseFile(file)
      
      if (toastId) {
        toast.dismiss(toastId)
      }
      
      setData(result.data)
      setColumns(result.columns)
      setPreviewColumnSelections({})
      setSelectedDataSourceId('main')

      toast.success(t('app.fileUploaded'), {
        description: t('app.fileUploadedDesc', {
          rows: result.data.length.toLocaleString(),
          columns: result.columns.length,
        })
      })
    } catch (error) {
      if (toastId) {
        toast.dismiss(toastId)
      }
      
      console.error('File upload error:', error)
      toast.error(t('app.uploadFailed'), {
        description: error instanceof Error ? error.message : t('app.invalidFile')
      })
      setData([])
      setColumns([])
      setFileName('')
      setPreviewColumnSelections({})
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setData([])
    setColumns([])
    setFileName('')
    setFilters([])
    setDateRangeColumn('')
    setDateRangeStart(null)
    setDateRangeEnd(null)
    setExtraDatasets([])
    setQueryResults([])
    setJoinHistory([])
    setPreviewColumnSelections({})
    setSelectedDataSourceId('main')
    setActiveTab('table')
  }

  const handleAddExtraFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('app.fileTooLarge'), { description: t('app.fileTooLargeDesc') })
      return
    }
    try {
      const result = await parseFile(file)
      const id = `extra-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setExtraDatasets(prev => [...prev, { id, name: file.name, data: result.data, columns: result.columns }])
      toast.success(t('app.addedAnotherFile'), {
        description: `${file.name} • ${result.data.length.toLocaleString()} rows × ${result.columns.length} columns`,
      })
    } catch (error) {
      toast.error(t('app.addFileFailed'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleRemoveExtraDataset = (id: string) => {
    setExtraDatasets(prev => prev.filter(d => d.id !== id))
    if (selectedDataSourceId === id) setSelectedDataSourceId('main')
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
    
    toast.success(t('app.queryExecuted'), {
      description: `Generated ${resultData.length} rows × ${resultColumns.length} columns`
    })
  }, [t])

  const handleRemoveResult = useCallback((id: string) => {
    setQueryResults(prev => prev.filter(r => r.id !== id))
    toast.info(t('app.queryRemoved'))
  }, [t])

  const handleExportResult = useCallback((result: QueryResult) => {
    exportToCSV(result.data, `${result.name.replace(/[^\w\s]/gi, '_')}.csv`)
    toast.success(t('app.exportSuccess'), {
      description: t('app.exportRows', { rows: result.data.length })
    })
  }, [t])

  const handleExportCurrentData = useCallback(() => {
    const current = selectedDataSource
    if (!current || current.data.length === 0) {
      toast.error(t('app.noDataToExport'), {
        description: t('app.noDataToExportDesc'),
      })
      return
    }

    const filename = `${current.name.replace(/[^\w\s-]/gi, '_')}.csv`
    exportToCSV(current.data, filename)
    toast.success(t('app.exportSuccess'), {
      description: t('app.exportRows', { rows: current.data.length }),
    })
  }, [selectedDataSource, t])

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('app.title')}
              </h1>
              <p className="text-muted-foreground">{t('app.subtitle')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger className="w-[140px] bg-card">
                  <div className="flex items-center gap-2">
                    <Globe size={16} weight="bold" />
                    <SelectValue placeholder={t('app.language')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              {data.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button onClick={handleExportCurrentData} variant="outline" size="lg">
                    <DownloadSimple size={20} weight="bold" className="mr-2" />
                    {t('app.exportCurrentData')}
                  </Button>
                  <input
                    ref={extraFileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleAddExtraFile(f)
                      e.target.value = ''
                    }}
                  />
                  <Button onClick={() => extraFileInputRef.current?.click()} variant="outline" size="lg">
                    <Plus size={20} weight="bold" className="mr-2" />
                    {t('app.addAnotherFile')}
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="lg">
                    <UploadSimple size={20} weight="bold" className="mr-2" />
                    {t('app.uploadNewFile')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {data.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t('app.currentFile')}:</span>
              <span>{fileName}</span>
              <span className="text-xs">•</span>
              <span>{t('app.rows', { count: data.length.toLocaleString() })}</span>
              {activeFiltersCount > 0 && (
                <>
                  <span className="text-xs">•</span>
                  <span className="text-accent font-medium">{t('app.filteredRows', { count: filteredData.length.toLocaleString() })}</span>
                </>
              )}
              {extraDatasets.length > 0 && (
                <>
                  <span className="text-xs">•</span>
                  <span className="text-foreground">{t('app.extraFiles')}:</span>
                  {extraDatasets.map(d => (
                    <Badge key={d.id} variant="secondary" className="gap-1 pr-1">
                      <span className="truncate max-w-[160px]">{d.name}</span>
                      <span className="text-[10px] opacity-70">({d.data.length})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraDataset(d.id)}
                        className="ml-1 rounded-sm hover:bg-destructive/10 p-0.5"
                        aria-label={`Remove ${d.name}`}
                      >
                        <X size={12} weight="bold" />
                      </button>
                    </Badge>
                  ))}
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-3xl grid-cols-7">
                <TabsTrigger value="table" className="gap-2">
                  <Table size={18} weight="bold" />
                  <span className="hidden sm:inline">{t('app.table')}</span>
                </TabsTrigger>
                <TabsTrigger value="charts" className="gap-2">
                  <ChartBar size={18} weight="bold" />
                  <span className="hidden sm:inline">{t('app.charts')}</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="gap-2">
                  <Function size={18} weight="bold" />
                  <span className="hidden sm:inline">{t('app.statistics')}</span>
                </TabsTrigger>
                <TabsTrigger value="correlation" className="gap-2">
                  <ArrowsInLineVertical size={18} weight="bold" />
                  <span className="hidden sm:inline">{t('app.correlation')}</span>
                </TabsTrigger>
                <TabsTrigger value="groupby" className="gap-2">
                  <FunnelSimple size={18} weight="bold" />
                  <span className="hidden sm:inline">{t('app.groupby')}</span>
                </TabsTrigger>
                <TabsTrigger value="time" className="gap-2">
                  <Clock size={18} weight="bold" />
                  <span className="hidden sm:inline">{t('app.time')}</span>
                </TabsTrigger>
                <TabsTrigger value="sql" className="gap-2">
                  <Code size={18} weight="bold" />
                  <span className="hidden sm:inline">{t('app.sql')}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-6">
                <div className="space-y-4">
                  {dataSources.length > 0 && (
                    <DataSourceSelector
                      currentSource={selectedDataSourceId}
                      sources={dataSources}
                      onSourceChange={setSelectedDataSourceId}
                    />
                  )}
                  <DataTable
                    sourceId={selectedDataSource?.id || 'main'}
                    data={selectedDataSource?.data || filteredData}
                    columns={selectedDataSource?.columns || columns}
                    onVisibleColumnsChange={handleVisibleColumnsChange}
                  />
                </div>
              </TabsContent>

              <TabsContent value="charts" className="mt-6">
                <div className="space-y-4">
                  {dataSources.length > 0 && (
                    <DataSourceSelector
                      currentSource={selectedDataSourceId}
                      sources={dataSources}
                      onSourceChange={setSelectedDataSourceId}
                    />
                  )}
                  <DataVisualization 
                    data={selectedDataSource?.data || filteredData} 
                    columns={selectedDataSource?.columns || columns} 
                  />
                </div>
              </TabsContent>

              <TabsContent value="stats" className="mt-6">
                <div className="space-y-4">
                  {dataSources.length > 0 && (
                    <DataSourceSelector
                      currentSource={selectedDataSourceId}
                      sources={dataSources}
                      onSourceChange={setSelectedDataSourceId}
                    />
                  )}
                  <StatisticsCards statistics={filteredStatistics} />
                </div>
              </TabsContent>

              <TabsContent value="correlation" className="mt-6">
                <div className="space-y-6">
                  {dataSources.length > 0 && (
                    <DataSourceSelector
                      currentSource={selectedDataSourceId}
                      sources={dataSources}
                      onSourceChange={setSelectedDataSourceId}
                    />
                  )}
                  
                  <CorrelationAnalysis 
                    correlationMatrix={correlationMatrix}
                    topCorrelations={topCorrelations}
                  />
                  
                  <ScatterPlot 
                    data={selectedDataSource?.data || filteredData}
                    columns={selectedDataSource?.columns || columns}
                  />
                </div>
              </TabsContent>

              <TabsContent value="time" className="mt-6">
                <TimeCompare
                  sources={dataSources}
                  currentSourceId={selectedDataSourceId}
                  onSourceChange={setSelectedDataSourceId}
                />
              </TabsContent>

              <TabsContent value="groupby" className="mt-6">
                <div className="space-y-6">
                  <GroupByPanel
                    data={filteredData}
                    columns={columns}
                    onGroupResult={handleQueryResult}
                  />
                  
                  {queryResults.length > 0 && (
                    <AggregatedBarChart
                      data={queryResults[queryResults.length - 1].data}
                      columns={queryResults[queryResults.length - 1].columns}
                    />
                  )}
                  
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

function App() {
  const [language, setLanguage] = useLocalStorageState<Language>('app-language', 'zh')

  return (
    <LanguageProvider language={language} setLanguage={setLanguage}>
      <AppContent />
    </LanguageProvider>
  )
}

export default App
