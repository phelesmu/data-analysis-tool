import { Database } from '@phosphor-icons/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { DataRow, ColumnInfo } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'

export interface DataSource {
  id: string
  name: string
  data: DataRow[]
  columns: ColumnInfo[]
  baseSourceId?: string
  kind?: 'base' | 'projection'
}

interface DataSourceSelectorProps {
  currentSource: string
  sources: DataSource[]
  onSourceChange: (sourceId: string) => void
}

export function DataSourceSelector({ currentSource, sources, onSourceChange }: DataSourceSelectorProps) {
  const selectedSource = sources.find(s => s.id === currentSource)
  const { t } = useLanguage()

  return (
    <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg border">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Database size={18} weight="bold" />
        <span>{t('dataSource.label')}:</span>
      </div>
      
      <Select value={currentSource} onValueChange={onSourceChange}>
        <SelectTrigger className="w-[280px] bg-card">
          <SelectValue placeholder={t('dataSource.select')} />
        </SelectTrigger>
        <SelectContent>
          {sources.map((source) => (
            <SelectItem key={source.id} value={source.id}>
              <div className="flex items-center justify-between gap-3 w-full">
                <span className="truncate">{source.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {source.data.length} rows
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {source.columns.length} cols
                  </Badge>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedSource && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
          <span>{t('dataSource.rowsColumns', {
            rows: selectedSource.data.length.toLocaleString(),
            columns: selectedSource.columns.length,
          })}</span>
        </div>
      )}
    </div>
  )
}
