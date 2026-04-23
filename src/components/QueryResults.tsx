import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, DownloadSimple, Table } from '@phosphor-icons/react'
import { DataTable } from '@/components/DataTable'
import { StatisticsCards } from '@/components/StatisticsCards'
import { DataVisualization } from '@/components/DataVisualization'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { calculateStatistics } from '@/lib/dataUtils'
import type { DataRow, ColumnInfo } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'

interface QueryResult {
  id: string
  name: string
  data: DataRow[]
  columns: ColumnInfo[]
  timestamp: Date
}

interface QueryResultsProps {
  results: QueryResult[]
  onRemoveResult: (id: string) => void
  onExportResult: (result: QueryResult) => void
}

export function QueryResults({ results, onRemoveResult, onExportResult }: QueryResultsProps) {
  const { language, t } = useLanguage()

  if (results.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('queryResults.title', { count: results.length })}</h3>
        {results.length > 0 && (
          <Badge variant="secondary">
            {t('queryResults.totalRecords', { count: results.reduce((sum, r) => sum + r.data.length, 0) })}
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {results.map((result) => {
          const statistics = calculateStatistics(result.data, result.columns)
          
          return (
            <Card key={result.id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{result.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {t('queryResults.resultMeta', { rows: result.data.length, columns: result.columns.length })} •{' '}
                      {new Date(result.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onExportResult(result)}
                    >
                      <DownloadSimple size={16} weight="bold" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveResult(result.id)}
                    >
                      <X size={16} weight="bold" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="table" className="w-full">
                  <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="table" className="gap-2">
                      <Table size={16} weight="bold" />
                      {t('app.table')}
                    </TabsTrigger>
                    <TabsTrigger value="charts" className="gap-2">
                      {t('app.charts')}
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="gap-2">
                      {t('app.statistics')}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="table" className="mt-4">
                    <DataTable sourceId={result.id} data={result.data} columns={result.columns} />
                  </TabsContent>

                  <TabsContent value="charts" className="mt-4">
                    <DataVisualization data={result.data} columns={result.columns} />
                  </TabsContent>

                  <TabsContent value="stats" className="mt-4">
                    <StatisticsCards statistics={statistics} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
