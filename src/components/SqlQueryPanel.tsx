import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Play, BookOpen, X } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DataRow, ColumnInfo } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'
import { parseDateValue } from '@/lib/dataUtils'

interface SqlQueryPanelProps {
  data: DataRow[]
  columns: ColumnInfo[]
  onQueryResult: (result: DataRow[], columns: ColumnInfo[], queryName: string) => void
}

export function SqlQueryPanel({ data, columns, onQueryResult }: SqlQueryPanelProps) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string>('')
  const [showExamples, setShowExamples] = useState(true)
  const { t, localeCode } = useLanguage()

  const executeQuery = async () => {
    setError('')
    
    if (!query.trim()) {
      setError(t('sql.empty'))
      return
    }

    try {
      const alasql = (await import('alasql')).default
      
      const result = alasql(query, [data])
      
      if (!Array.isArray(result) || result.length === 0) {
        setError(t('sql.noData'))
        return
      }

      const newColumns: ColumnInfo[] = Object.keys(result[0]).map(key => {
        const sampleValues = result.slice(0, 10).map(row => row[key]).filter(v => v != null)
        const isNumeric = sampleValues.every(v => typeof v === 'number' || !isNaN(Number(v)))
        const isDate = sampleValues.some(v => parseDateValue(v) !== null)
        
        return {
          name: key,
          type: isDate ? 'date' : isNumeric ? 'numeric' : 'text'
        }
      })

      const queryName = t('sql.resultName', {
        time: new Date().toLocaleTimeString(localeCode),
      })
      onQueryResult(result, newColumns, queryName)
      setQuery('')
      setShowExamples(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sql.failed'))
    }
  }

  const exampleQueries = [
    {
      title: t('sql.example.selectColumns.title'),
      query: `SELECT ${columns.slice(0, 3).map(c => `[${c.name}]`).join(', ')} FROM ?`,
      description: t('sql.example.selectColumns.desc')
    },
    {
      title: t('sql.example.aggregate.title'),
      query: columns.filter(c => c.type === 'numeric').length > 0
        ? `SELECT COUNT(*) as total_count, AVG([${columns.find(c => c.type === 'numeric')?.name}]) as average_value FROM ?`
        : 'SELECT COUNT(*) as total_count FROM ?',
      description: t('sql.example.aggregate.desc')
    },
    {
      title: t('sql.example.group.title'),
      query: columns.length > 1
        ? `SELECT [${columns[0].name}], COUNT(*) as count_value FROM ? GROUP BY [${columns[0].name}] ORDER BY count_value DESC`
        : 'SELECT COUNT(*) as count_value FROM ?',
      description: t('sql.example.group.desc')
    },
    {
      title: t('sql.example.filter.title'),
      query: columns.filter(c => c.type === 'numeric').length > 0
        ? `SELECT * FROM ? WHERE [${columns.find(c => c.type === 'numeric')?.name}] > 0`
        : 'SELECT * FROM ? LIMIT 10',
      description: t('sql.example.filter.desc')
    }
  ]

  const insertExample = (exampleQuery: string) => {
    setQuery(exampleQuery)
    setShowExamples(false)
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Play size={24} weight="bold" />
              {t('sql.title')}
            </CardTitle>
            <CardDescription className="mt-2">
              {t('sql.description')} <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">?</code>
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExamples(!showExamples)}
          >
            <BookOpen size={20} weight={showExamples ? 'fill' : 'regular'} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showExamples && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t('sql.examples')}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExamples(false)}
              >
                <X size={16} />
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {exampleQueries.map((example, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => insertExample(example.query)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h5 className="text-sm font-medium">{example.title}</h5>
                        <Badge variant="outline" className="text-xs">{t('sql.clickToUse')}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{example.description}</p>
                      <code className="text-xs block bg-muted p-2 rounded font-mono break-all">
                        {example.query}
                      </code>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t('sql.query')}</label>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>{t('sql.availableColumns')}: {columns.length}</span>
              <span>•</span>
              <span>{t('sql.dataRows')}: {data.length}</span>
            </div>
          </div>
          <Textarea
            id="sql-query"
            placeholder={t('sql.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="font-mono text-sm min-h-[120px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                executeQuery()
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            {t('sql.tip')} <kbd className="px-1 py-0.5 rounded bg-muted">Ctrl/Cmd + Enter</kbd>
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={executeQuery} 
            className="flex-1"
            size="lg"
          >
            <Play size={20} weight="bold" className="mr-2" />
            {t('sql.run')}
          </Button>
          <Button 
            onClick={() => {
              setQuery('')
              setError('')
            }} 
            variant="outline"
            size="lg"
          >
            {t('sql.clear')}
          </Button>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="text-sm font-medium">{t('sql.columns')}</h4>
          <div className="flex flex-wrap gap-2">
            {columns.map((col) => (
              <Badge
                key={col.name}
                variant="secondary"
                className="cursor-pointer hover:bg-accent"
                onClick={() => setQuery(prev => prev + `[${col.name}]`)}
              >
                {col.name}
                <span className="ml-1 text-xs opacity-60">
                  ({t(`columnType.${col.type}`)})
                </span>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
