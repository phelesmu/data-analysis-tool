import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Statistics } from '@/lib/types'

interface StatisticsCardsProps {
  statistics: Statistics[]
}

export function StatisticsCards({ statistics }: StatisticsCardsProps) {
  if (statistics.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No numeric columns found in the data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Statistical Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statistics.map((stat) => (
          <Card key={stat.column} className="overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardTitle className="text-base font-semibold">{stat.column}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Count</p>
                  <p className="text-lg font-bold font-mono tabular-nums">{stat.count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Mean</p>
                  <p className="text-lg font-bold font-mono tabular-nums">{stat.mean}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Median</p>
                  <p className="text-lg font-bold font-mono tabular-nums">{stat.median}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Sum</p>
                  <p className="text-lg font-bold font-mono tabular-nums">{stat.sum}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Min</p>
                  <p className="text-lg font-bold font-mono tabular-nums">{stat.min}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Max</p>
                  <p className="text-lg font-bold font-mono tabular-nums">{stat.max}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
