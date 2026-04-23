import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowsLeftRight, Play, Info } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import type { DataRow, ColumnInfo, JoinRelationship } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'

interface QueryResult {
  id: string
  name: string
  data: DataRow[]
  columns: ColumnInfo[]
  timestamp: Date
}

interface JoinPanelProps {
  queryResults: QueryResult[]
  onJoinResult: (result: DataRow[], columns: ColumnInfo[], joinName: string, joinRelationship: JoinRelationship) => void
}

type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'

export function JoinPanel({ queryResults, onJoinResult }: JoinPanelProps) {
  const { t } = useLanguage()
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
      setError(t('join.error.selectTwoTables'))
      return
    }

    if (!leftColumn || !rightColumn) {
      setError(t('join.error.selectColumns'))
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
          setError(t('join.error.noData'))
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
        
        const joinRelationship: JoinRelationship = {
          id: `join-${Date.now()}`,
          leftTable: leftTable,
          rightTable: rightTable,
          leftColumn: leftColumn,
          rightColumn: rightColumn,
          joinType: joinType,
          resultName: joinName
        }
        
        onJoinResult(fullResult, newColumns, joinName, joinRelationship)
        return
      }

      const result = alasql(query, [leftTableData.data, rightTableData.data])

      if (!Array.isArray(result) || result.length === 0) {
        setError(t('join.error.noData'))
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
      
      const joinRelationship: JoinRelationship = {
        id: `join-${Date.now()}`,
        leftTable: leftTable,
        rightTable: rightTable,
        leftColumn: leftColumn,
        rightColumn: rightColumn,
        joinType: joinType,
        resultName: joinName
      }
      
      onJoinResult(result, newColumns, joinName, joinRelationship)

      setLeftTable('')
      setRightTable('')
      setLeftColumn('')
      setRightColumn('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('join.error.failed'))
    }
  }

  if (queryResults.length < 2) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-12">
          <div className="text-center space-y-2">
            <ArrowsLeftRight size={48} weight="thin" className="mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium text-muted-foreground">{t('join.needResultsTitle')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('join.needResultsDesc')}
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
          {t('join.title')}
        </CardTitle>
        <CardDescription>
          {t('join.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info size={16} weight="bold" />
          <AlertDescription className="text-xs">
            <strong>{t('join.helpTitle')}:</strong><br/>
            • <strong>INNER JOIN</strong>: {t('join.help.inner')}<br/>
            • <strong>LEFT JOIN</strong>: {t('join.help.left')}<br/>
            • <strong>RIGHT JOIN</strong>: {t('join.help.right')}<br/>
            • <strong>FULL JOIN</strong>: {t('join.help.full')}
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 p-4 rounded-lg bg-accent/10 border-2 border-accent/30">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t('join.leftTable')}</Badge>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="left-table">{t('join.selectTable')}</Label>
              <Select value={leftTable} onValueChange={setLeftTable}>
                <SelectTrigger id="left-table">
                  <SelectValue placeholder={t('join.selectLeftTable')} />
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
                        ({t('join.rows', { count: result.data.length })})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="left-column">{t('join.joinColumn')}</Label>
              <Select 
                value={leftColumn} 
                onValueChange={setLeftColumn}
                disabled={!leftTable}
              >
                <SelectTrigger id="left-column">
                  <SelectValue placeholder={t('join.selectColumn')} />
                </SelectTrigger>
                <SelectContent>
                  {leftTableData?.columns.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({t(`columnType.${col.type}`)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t('join.rightTable')}</Badge>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="right-table">{t('join.selectTable')}</Label>
              <Select value={rightTable} onValueChange={setRightTable}>
                <SelectTrigger id="right-table">
                  <SelectValue placeholder={t('join.selectRightTable')} />
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
                        ({t('join.rows', { count: result.data.length })})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="right-column">{t('join.joinColumn')}</Label>
              <Select 
                value={rightColumn} 
                onValueChange={setRightColumn}
                disabled={!rightTable}
              >
                <SelectTrigger id="right-column">
                  <SelectValue placeholder={t('join.selectColumn')} />
                </SelectTrigger>
                <SelectContent>
                  {rightTableData?.columns.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({t(`columnType.${col.type}`)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="join-type">{t('join.type')}</Label>
          <Select value={joinType} onValueChange={(v) => setJoinType(v as JoinType)}>
            <SelectTrigger id="join-type" className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INNER">{t('join.type.inner')}</SelectItem>
              <SelectItem value="LEFT">{t('join.type.left')}</SelectItem>
              <SelectItem value="RIGHT">{t('join.type.right')}</SelectItem>
              <SelectItem value="FULL">{t('join.type.full')}</SelectItem>
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
            {t('join.execute')}
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
            {t('join.reset')}
          </Button>
        </div>

        {canExecuteJoin && leftTableData && rightTableData && (
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">{t('join.preview')}</h4>
            <code className="text-xs block font-mono break-all text-muted-foreground">
              {joinType} JOIN: {leftTableData.name} ({t('join.rows', { count: leftTableData.data.length })}) 
              ⋈ {rightTableData.name} ({t('join.rows', { count: rightTableData.data.length })})
              <br/>
              ON {leftTableData.name}.[{leftColumn}] = {rightTableData.name}.[{rightColumn}]
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
