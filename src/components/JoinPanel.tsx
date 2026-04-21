import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowsLeftRight, Play, Info } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import type { DataRow, ColumnInfo } from '@/lib/types'

interface QueryResult {
  id: string
  name: string
  data: DataRow[]
  columns: ColumnInfo[]
  timestamp: Date
}

interface JoinPanelProps {
  queryResults: QueryResult[]
  onJoinResult: (result: DataRow[], columns: ColumnInfo[], joinName: string) => void
}

type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'

export function JoinPanel({ queryResults, onJoinResult }: JoinPanelProps) {
  const [leftTable, setLeftTable] = useState<string>('')
  const [rightTable, setRightTable] = useState<string>('')
  const [leftColumn, setLeftColumn] = useState<string>('')
  const [rightColumn, setRightColumn] = useState<string>('')
  const [joinType, setJoinType] = useState<JoinType>('INNER')
  const [error, setError] = useState<string>('')

  const leftTableData = useMemo(() => 
    queryResults.find(r => r.id === leftTable), 
    [queryResults, leftTable]
  )
  
  const rightTableData = useMemo(() => 
    queryResults.find(r => r.id === rightTable), 
    [queryResults, rightTable]
  )

  const canExecuteJoin = leftTable && rightTable && leftColumn && rightColumn && leftTable !== rightTable

  const executeJoin = async () => {
    setError('')

    if (!leftTableData || !rightTableData) {
      setError('请选择两个不同的查询结果表')
      return
    }

    if (!leftColumn || !rightColumn) {
      setError('请选择连接列')
      return
    }

    try {
      const alasql = (await import('alasql')).default

      const leftAlias = 'L'
      const rightAlias = 'R'

      const leftColumnsSelect = leftTableData.columns
        .map(col => `${leftAlias}.[${col.name}] AS [L_${col.name}]`)
        .join(', ')
      
      const rightColumnsSelect = rightTableData.columns
        .map(col => `${rightAlias}.[${col.name}] AS [R_${col.name}]`)
        .join(', ')

      let query = ''
      
      if (joinType === 'INNER') {
        query = `
          SELECT ${leftColumnsSelect}, ${rightColumnsSelect}
          FROM ? AS ${leftAlias}
          INNER JOIN ? AS ${rightAlias}
          ON ${leftAlias}.[${leftColumn}] = ${rightAlias}.[${rightColumn}]
        `
      } else if (joinType === 'LEFT') {
        query = `
          SELECT ${leftColumnsSelect}, ${rightColumnsSelect}
          FROM ? AS ${leftAlias}
          LEFT JOIN ? AS ${rightAlias}
          ON ${leftAlias}.[${leftColumn}] = ${rightAlias}.[${rightColumn}]
        `
      } else if (joinType === 'RIGHT') {
        query = `
          SELECT ${leftColumnsSelect}, ${rightColumnsSelect}
          FROM ? AS ${leftAlias}
          RIGHT JOIN ? AS ${rightAlias}
          ON ${leftAlias}.[${leftColumn}] = ${rightAlias}.[${rightColumn}]
        `
      } else if (joinType === 'FULL') {
        const leftJoin = alasql(
          `SELECT ${leftColumnsSelect}, ${rightColumnsSelect}
           FROM ? AS ${leftAlias}
           LEFT JOIN ? AS ${rightAlias}
           ON ${leftAlias}.[${leftColumn}] = ${rightAlias}.[${rightColumn}]`,
          [leftTableData.data, rightTableData.data]
        )
        
        const rightJoin = alasql(
          `SELECT ${leftColumnsSelect}, ${rightColumnsSelect}
           FROM ? AS ${leftAlias}
           RIGHT JOIN ? AS ${rightAlias}
           ON ${leftAlias}.[${leftColumn}] = ${rightAlias}.[${rightColumn}]
           WHERE ${leftAlias}.[${leftColumn}] IS NULL`,
          [leftTableData.data, rightTableData.data]
        )
        
        const fullResult = (leftJoin as DataRow[]).concat(rightJoin as DataRow[])
        
        if (fullResult.length === 0) {
          setError('JOIN 操作未返回任何数据')
          return
        }

        const newColumns: ColumnInfo[] = Object.keys(fullResult[0]).map(key => {
          const originalColumn = [...leftTableData.columns, ...rightTableData.columns]
            .find(c => key.includes(c.name))
          
          return {
            name: key,
            type: originalColumn?.type || 'text'
          }
        })

        const joinName = `${joinType} JOIN: ${leftTableData.name} ⋈ ${rightTableData.name}`
        onJoinResult(fullResult, newColumns, joinName)
        return
      }

      const result = alasql(query, [leftTableData.data, rightTableData.data])

      if (!Array.isArray(result) || result.length === 0) {
        setError('JOIN 操作未返回任何数据')
        return
      }

      const newColumns: ColumnInfo[] = Object.keys(result[0]).map(key => {
        const originalColumn = [...leftTableData.columns, ...rightTableData.columns]
          .find(c => key.includes(c.name))
        
        return {
          name: key,
          type: originalColumn?.type || 'text'
        }
      })

      const joinName = `${joinType} JOIN: ${leftTableData.name} ⋈ ${rightTableData.name}`
      onJoinResult(result, newColumns, joinName)

      setLeftTable('')
      setRightTable('')
      setLeftColumn('')
      setRightColumn('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JOIN 操作失败')
    }
  }

  if (queryResults.length < 2) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-12">
          <div className="text-center space-y-2">
            <ArrowsLeftRight size={48} weight="thin" className="mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium text-muted-foreground">需要至少 2 个查询结果</h3>
            <p className="text-sm text-muted-foreground">
              请先执行 SQL 查询生成至少两个结果表，然后再进行 JOIN 操作
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowsLeftRight size={24} weight="bold" />
          JOIN 操作
        </CardTitle>
        <CardDescription>
          合并两个查询结果表，通过指定的列进行连接
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info size={16} weight="bold" />
          <AlertDescription className="text-xs">
            <strong>JOIN 类型说明：</strong><br/>
            • <strong>INNER JOIN</strong>: 返回两表中匹配的行<br/>
            • <strong>LEFT JOIN</strong>: 返回左表所有行，右表匹配的行<br/>
            • <strong>RIGHT JOIN</strong>: 返回右表所有行，左表匹配的行<br/>
            • <strong>FULL JOIN</strong>: 返回两表的所有行
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 p-4 rounded-lg bg-accent/10 border-2 border-accent/30">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">左表</Badge>
              <span className="text-xs text-muted-foreground">Left Table</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="left-table">选择表</Label>
              <Select value={leftTable} onValueChange={setLeftTable}>
                <SelectTrigger id="left-table">
                  <SelectValue placeholder="选择左表" />
                </SelectTrigger>
                <SelectContent>
                  {queryResults.map((result) => (
                    <SelectItem 
                      key={result.id} 
                      value={result.id}
                      disabled={result.id === rightTable}
                    >
                      {result.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({result.data.length} 行)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="left-column">连接列</Label>
              <Select 
                value={leftColumn} 
                onValueChange={setLeftColumn}
                disabled={!leftTable}
              >
                <SelectTrigger id="left-column">
                  <SelectValue placeholder="选择列" />
                </SelectTrigger>
                <SelectContent>
                  {leftTableData?.columns.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({col.type === 'numeric' ? '数字' : col.type === 'date' ? '日期' : '文本'})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">右表</Badge>
              <span className="text-xs text-muted-foreground">Right Table</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="right-table">选择表</Label>
              <Select value={rightTable} onValueChange={setRightTable}>
                <SelectTrigger id="right-table">
                  <SelectValue placeholder="选择右表" />
                </SelectTrigger>
                <SelectContent>
                  {queryResults.map((result) => (
                    <SelectItem 
                      key={result.id} 
                      value={result.id}
                      disabled={result.id === leftTable}
                    >
                      {result.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({result.data.length} 行)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="right-column">连接列</Label>
              <Select 
                value={rightColumn} 
                onValueChange={setRightColumn}
                disabled={!rightTable}
              >
                <SelectTrigger id="right-column">
                  <SelectValue placeholder="选择列" />
                </SelectTrigger>
                <SelectContent>
                  {rightTableData?.columns.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({col.type === 'numeric' ? '数字' : col.type === 'date' ? '日期' : '文本'})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="join-type">JOIN 类型</Label>
          <Select value={joinType} onValueChange={(v) => setJoinType(v as JoinType)}>
            <SelectTrigger id="join-type" className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INNER">INNER JOIN (内连接)</SelectItem>
              <SelectItem value="LEFT">LEFT JOIN (左连接)</SelectItem>
              <SelectItem value="RIGHT">RIGHT JOIN (右连接)</SelectItem>
              <SelectItem value="FULL">FULL JOIN (全连接)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={executeJoin} 
            className="flex-1"
            size="lg"
            disabled={!canExecuteJoin}
          >
            <Play size={20} weight="bold" className="mr-2" />
            执行 JOIN
          </Button>
          <Button 
            onClick={() => {
              setLeftTable('')
              setRightTable('')
              setLeftColumn('')
              setRightColumn('')
              setError('')
            }} 
            variant="outline"
            size="lg"
          >
            重置
          </Button>
        </div>

        {canExecuteJoin && leftTableData && rightTableData && (
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">预览 JOIN 操作</h4>
            <code className="text-xs block font-mono break-all text-muted-foreground">
              {joinType} JOIN: {leftTableData.name} ({leftTableData.data.length} 行) 
              ⋈ {rightTableData.name} ({rightTableData.data.length} 行)
              <br/>
              ON {leftTableData.name}.[{leftColumn}] = {rightTableData.name}.[{rightColumn}]
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
