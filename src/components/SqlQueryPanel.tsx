import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Play, BookOpen, X } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DataRow, ColumnInfo } from '@/lib/types'

interface SqlQueryPanelProps {
  data: DataRow[]
  columns: ColumnInfo[]
  onQueryResult: (result: DataRow[], columns: ColumnInfo[], queryName: string) => void
}

export function SqlQueryPanel({ data, columns, onQueryResult }: SqlQueryPanelProps) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string>('')
  const [showExamples, setShowExamples] = useState(true)

  const executeQuery = async () => {
    setError('')
    
    if (!query.trim()) {
      setError('请输入 SQL 查询语句')
      return
    }

    try {
      const alasql = (await import('alasql')).default
      
      const result = alasql(query, [data])
      
      if (!Array.isArray(result) || result.length === 0) {
        setError('查询未返回任何数据')
        return
      }

      const newColumns: ColumnInfo[] = Object.keys(result[0]).map(key => {
        const sampleValues = result.slice(0, 10).map(row => row[key]).filter(v => v != null)
        const isNumeric = sampleValues.every(v => typeof v === 'number' || !isNaN(Number(v)))
        const isDate = sampleValues.some(v => {
          if (typeof v === 'string') {
            const date = new Date(v)
            return !isNaN(date.getTime())
          }
          return false
        })
        
        return {
          name: key,
          type: isDate ? 'date' : isNumeric ? 'numeric' : 'text'
        }
      })

      const queryName = `查询结果 ${new Date().toLocaleTimeString('zh-CN')}`
      onQueryResult(result, newColumns, queryName)
      setQuery('')
      setShowExamples(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询执行失败')
    }
  }

  const exampleQueries = [
    {
      title: '选择特定列',
      query: `SELECT ${columns.slice(0, 3).map(c => `[${c.name}]`).join(', ')} FROM ?`,
      description: '选择前几列数据'
    },
    {
      title: '聚合统计',
      query: columns.filter(c => c.type === 'numeric').length > 0
        ? `SELECT COUNT(*) as 总数, AVG([${columns.find(c => c.type === 'numeric')?.name}]) as 平均值 FROM ?`
        : 'SELECT COUNT(*) as 总数 FROM ?',
      description: '计算记录总数和平均值'
    },
    {
      title: '分组统计',
      query: columns.length > 1
        ? `SELECT [${columns[0].name}], COUNT(*) as 数量 FROM ? GROUP BY [${columns[0].name}] ORDER BY 数量 DESC`
        : 'SELECT COUNT(*) as 数量 FROM ?',
      description: '按列分组并统计数量'
    },
    {
      title: '过滤数据',
      query: columns.filter(c => c.type === 'numeric').length > 0
        ? `SELECT * FROM ? WHERE [${columns.find(c => c.type === 'numeric')?.name}] > 0`
        : 'SELECT * FROM ? LIMIT 10',
      description: '筛选符合条件的数据'
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
              SQL 查询编辑器
            </CardTitle>
            <CardDescription className="mt-2">
              使用 SQL 语句查询和转换数据。表名使用 <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">?</code> 表示当前数据集。
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
              <h4 className="text-sm font-medium">示例查询</h4>
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
                        <Badge variant="outline" className="text-xs">点击使用</Badge>
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
            <label className="text-sm font-medium">SQL 查询</label>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>可用列数: {columns.length}</span>
              <span>•</span>
              <span>数据行数: {data.length}</span>
            </div>
          </div>
          <Textarea
            id="sql-query"
            placeholder="SELECT * FROM ? LIMIT 10"
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
            提示：使用 <kbd className="px-1 py-0.5 rounded bg-muted">Ctrl/Cmd + Enter</kbd> 快速执行
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
            执行查询
          </Button>
          <Button 
            onClick={() => {
              setQuery('')
              setError('')
            }} 
            variant="outline"
            size="lg"
          >
            清空
          </Button>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="text-sm font-medium">可用列名</h4>
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
                  ({col.type === 'numeric' ? '数字' : col.type === 'date' ? '日期' : '文本'})
                </span>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
