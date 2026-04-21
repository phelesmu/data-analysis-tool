import { useEffect, useRef, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GitFork } from '@phosphor-icons/react'
import type { DataRow, ColumnInfo } from '@/lib/types'

interface QueryResult {
  id: string
  name: string
  data: DataRow[]
  columns: ColumnInfo[]
  timestamp: Date
}

interface JoinRelationship {
  id: string
  leftTable: string
  rightTable: string
  leftColumn: string
  rightColumn: string
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
  resultName: string
}

interface RelationshipDiagramProps {
  queryResults: QueryResult[]
  joinHistory: JoinRelationship[]
}

interface Node {
  id: string
  name: string
  type: 'table' | 'join'
  rowCount: number
  columnCount: number
  columns: ColumnInfo[]
}

interface TooltipData {
  visible: boolean
  x: number
  y: number
  node: Node | null
}

interface Link {
  source: string
  target: string
  leftColumn: string
  rightColumn: string
  joinType: string
}

export function RelationshipDiagram({ queryResults, joinHistory }: RelationshipDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false,
    x: 0,
    y: 0,
    node: null
  })

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, Node>()
    const linkList: Link[] = []

    queryResults.forEach(result => {
      if (!result.name.includes('JOIN:')) {
        nodeMap.set(result.id, {
          id: result.id,
          name: result.name,
          type: 'table',
          rowCount: result.data.length,
          columnCount: result.columns.length,
          columns: result.columns
        })
      }
    })

    joinHistory.forEach(join => {
      const joinResult = queryResults.find(r => r.name === join.resultName)
      if (joinResult) {
        nodeMap.set(joinResult.id, {
          id: joinResult.id,
          name: join.resultName,
          type: 'join',
          rowCount: joinResult.data.length,
          columnCount: joinResult.columns.length,
          columns: joinResult.columns
        })

        linkList.push({
          source: join.leftTable,
          target: joinResult.id,
          leftColumn: join.leftColumn,
          rightColumn: join.rightColumn,
          joinType: join.joinType
        })

        linkList.push({
          source: join.rightTable,
          target: joinResult.id,
          leftColumn: join.leftColumn,
          rightColumn: join.rightColumn,
          joinType: join.joinType
        })
      }
    })

    return {
      nodes: Array.from(nodeMap.values()),
      links: linkList
    }
  }, [queryResults, joinHistory])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = Math.max(400, nodes.length * 80)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    const g = svg.append('g')

    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(200))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(80))

    const defs = g.append('defs')

    const gradient = defs.append('linearGradient')
      .attr('id', 'link-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'oklch(0.7 0.15 195)')
      .attr('stop-opacity', 0.6)

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'oklch(0.35 0.15 265)')
      .attr('stop-opacity', 0.6)

    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', 'oklch(0.35 0.15 265)')
      .attr('opacity', 0.6)

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'url(#link-gradient)')
      .attr('stroke-width', 3)
      .attr('marker-end', 'url(#arrowhead)')

    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', 'oklch(0.5 0.01 265)')
      .attr('pointer-events', 'none')
      .text((d: any) => d.joinType)

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)

    node.append('rect')
      .attr('width', 180)
      .attr('height', 70)
      .attr('x', -90)
      .attr('y', -35)
      .attr('rx', 8)
      .attr('fill', (d: any) => d.type === 'join' ? 'oklch(0.35 0.15 265)' : 'oklch(1 0 0)')
      .attr('stroke', (d: any) => d.type === 'join' ? 'oklch(0.35 0.15 265)' : 'oklch(0.7 0.15 195)')
      .attr('stroke-width', 2)
      .style('cursor', 'grab')
      .style('filter', 'drop-shadow(0 2px 8px oklch(0 0 0 / 0.1))')
      .on('mouseenter', function(event: any, d: any) {
        const containerRect = containerRef.current?.getBoundingClientRect()
        if (containerRect) {
          setTooltip({
            visible: true,
            x: event.pageX - containerRect.left,
            y: event.pageY - containerRect.top,
            node: d
          })
        }
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 3)
          .style('filter', 'drop-shadow(0 4px 12px oklch(0 0 0 / 0.2))')
      })
      .on('mousemove', function(event: any) {
        const containerRect = containerRef.current?.getBoundingClientRect()
        if (containerRect) {
          setTooltip(prev => ({
            ...prev,
            x: event.pageX - containerRect.left,
            y: event.pageY - containerRect.top
          }))
        }
      })
      .on('mouseleave', function() {
        setTooltip({ visible: false, x: 0, y: 0, node: null })
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 2)
          .style('filter', 'drop-shadow(0 2px 8px oklch(0 0 0 / 0.1))')
      })

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-8')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('font-family', 'Space Grotesk, sans-serif')
      .attr('fill', (d: any) => d.type === 'join' ? 'oklch(0.99 0 0)' : 'oklch(0.2 0 0)')
      .style('pointer-events', 'none')
      .text((d: any) => {
        const maxLength = 20
        return d.name.length > maxLength ? d.name.substring(0, maxLength) + '...' : d.name
      })

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '8')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', (d: any) => d.type === 'join' ? 'oklch(0.85 0.05 265)' : 'oklch(0.5 0.01 265)')
      .style('pointer-events', 'none')
      .text((d: any) => `${d.rowCount} rows × ${d.columnCount} cols`)

    node.append('circle')
      .attr('r', 6)
      .attr('cx', -90)
      .attr('cy', -35)
      .attr('fill', (d: any) => d.type === 'join' ? 'oklch(0.7 0.15 195)' : 'oklch(0.35 0.15 265)')



    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 8)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: any) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [nodes, links])

  if (nodes.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-12">
          <div className="text-center space-y-2">
            <GitFork size={48} weight="thin" className="mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium text-muted-foreground">暂无关系图</h3>
            <p className="text-sm text-muted-foreground">
              执行 JOIN 操作后，这里将显示表之间的关系可视化
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getColumnTypeLabel = (type: string) => {
    switch (type) {
      case 'numeric': return '数字'
      case 'date': return '日期'
      case 'text': return '文本'
      default: return type
    }
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitFork size={24} weight="bold" />
          关系图
        </CardTitle>
        <CardDescription>
          可视化显示查询结果表之间的 JOIN 关系，拖动节点重新排列布局
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full rounded-lg bg-muted/30 border-2 border-border overflow-hidden relative">
          <svg ref={svgRef} className="w-full" />
          
          {tooltip.visible && tooltip.node && (
            <div
              className="absolute z-50 pointer-events-none"
              style={{
                left: `${tooltip.x + 20}px`,
                top: `${tooltip.y + 20}px`,
                maxWidth: '400px'
              }}
            >
              <div className="bg-card border-2 border-border rounded-lg shadow-xl p-4 font-mono text-xs">
                <div className="space-y-3">
                  <div className="pb-2 border-b border-border">
                    <div className="font-bold text-sm text-foreground mb-1">
                      {tooltip.node.name}
                    </div>
                    <div className="text-muted-foreground">
                      {tooltip.node.rowCount} 行 × {tooltip.node.columnCount} 列
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground mb-2 font-semibold">列详情:</div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {tooltip.node.columns.map((col, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start justify-between gap-4 py-1 px-2 rounded bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {col.name}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              col.type === 'numeric' 
                                ? 'bg-accent text-accent-foreground' 
                                : col.type === 'date'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground'
                            }`}>
                              {getColumnTypeLabel(col.type)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-accent bg-card" />
            <span>原始表</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-primary bg-primary" />
            <span>JOIN 结果</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="2">
              <line x1="0" y1="1" x2="24" y2="1" stroke="oklch(0.7 0.15 195)" strokeWidth="2" />
            </svg>
            <span>JOIN 连接</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
