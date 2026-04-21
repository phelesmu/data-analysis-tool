import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowsInLineVertical } from '@phosphor-icons/react'
import type { CorrelationMatrix, CorrelationPair } from '@/lib/types'

interface CorrelationAnalysisProps {
  correlationMatrix: CorrelationMatrix
  topCorrelations: CorrelationPair[]
}

function getCorrelationColor(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 0.7) return 'from-red-500 to-red-600'
  if (abs >= 0.5) return 'from-orange-500 to-orange-600'
  if (abs >= 0.3) return 'from-yellow-500 to-yellow-600'
  return 'from-blue-500 to-blue-600'
}

function getCorrelationLabel(value: number): { label: string; color: string } {
  const abs = Math.abs(value)
  if (abs >= 0.7) return { label: 'Strong', color: 'bg-red-500' }
  if (abs >= 0.5) return { label: 'Moderate', color: 'bg-orange-500' }
  if (abs >= 0.3) return { label: 'Weak', color: 'bg-yellow-500' }
  return { label: 'Very Weak', color: 'bg-blue-500' }
}

export function CorrelationAnalysis({ correlationMatrix, topCorrelations }: CorrelationAnalysisProps) {
  const hasData = correlationMatrix.columns.length >= 2

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowsInLineVertical size={24} weight="bold" className="text-primary" />
            <CardTitle>Correlation Analysis</CardTitle>
          </div>
          <CardDescription>
            Statistical relationships between numeric columns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ArrowsInLineVertical size={48} weight="light" className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Need at least 2 numeric columns to calculate correlations
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowsInLineVertical size={24} weight="bold" className="text-primary" />
            <CardTitle>Top Correlations</CardTitle>
          </div>
          <CardDescription>
            Strongest relationships between numeric columns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {topCorrelations.map((pair, index) => {
                const corrLabel = getCorrelationLabel(pair.correlation)
                const direction = pair.correlation >= 0 ? 'Positive' : 'Negative'
                
                return (
                  <div 
                    key={`${pair.column1}-${pair.column2}`}
                    className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                          <Badge variant="secondary" className={corrLabel.color}>
                            {corrLabel.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {direction}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium truncate">{pair.column1}</p>
                          <p className="text-xs text-muted-foreground">↔</p>
                          <p className="text-sm font-medium truncate">{pair.column2}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-2xl font-bold font-mono">
                          {pair.correlation.toFixed(3)}
                        </span>
                        <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${getCorrelationColor(pair.correlation)}`}
                            style={{ width: `${Math.abs(pair.correlation) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {topCorrelations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No correlations to display
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Correlation Matrix</CardTitle>
          <CardDescription>
            Pearson correlation coefficients (-1 to 1)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 bg-muted/50 text-xs font-medium text-left sticky left-0 z-10">
                      Column
                    </th>
                    {correlationMatrix.columns.map((col) => (
                      <th 
                        key={col} 
                        className="border p-2 bg-muted/50 text-xs font-medium min-w-[80px]"
                        title={col}
                      >
                        <div className="truncate max-w-[80px]">{col}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlationMatrix.columns.map((rowCol, i) => (
                    <tr key={rowCol}>
                      <td 
                        className="border p-2 bg-muted/50 text-xs font-medium sticky left-0 z-10"
                        title={rowCol}
                      >
                        <div className="truncate max-w-[120px]">{rowCol}</div>
                      </td>
                      {correlationMatrix.matrix[i].map((value, j) => {
                        const isIdentity = i === j
                        const bgIntensity = Math.abs(value) * 100
                        const isPositive = value >= 0
                        
                        return (
                          <td
                            key={`${i}-${j}`}
                            className="border p-2 text-center text-xs font-mono relative"
                            style={{
                              backgroundColor: isIdentity 
                                ? 'oklch(0.92 0.01 265)'
                                : `${isPositive ? 'oklch(0.7 0.15 195 /' : 'oklch(0.7 0.15 27 /'} ${bgIntensity * 0.5}%)`
                            }}
                            title={`${correlationMatrix.columns[i]} ↔ ${correlationMatrix.columns[j]}: ${value.toFixed(3)}`}
                          >
                            {value.toFixed(2)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'oklch(0.7 0.15 195 / 50%)' }} />
              <span className="text-muted-foreground">Positive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'oklch(0.7 0.15 27 / 50%)' }} />
              <span className="text-muted-foreground">Negative</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted" />
              <span className="text-muted-foreground">Identity (1.0)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
