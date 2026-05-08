import { useEffect, useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { ChartTile } from '../types'
import { chartRows } from '../features/dashboard/charting'

type PlotlyModule = {
  newPlot: (
    element: HTMLElement,
    traces: unknown[],
    layout: Record<string, unknown>,
    config: Record<string, unknown>,
  ) => Promise<unknown>
  purge: (element: HTMLElement) => void
}

type ChartTileViewProps = {
  tile: ChartTile
  onRemove: (id: string) => void
}

export function ChartTileView({ tile, onRemove }: ChartTileViewProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string>()
  const rows = useMemo(() => chartRows(tile), [tile])

  useEffect(() => {
    if (tile.type === 'table' || !ref.current) {
      return undefined
    }

    let cancelled = false
    const element = ref.current

    import('plotly.js-dist-min')
      .then((module) => {
        if (cancelled) {
          return
        }
        const plotly = module.default as PlotlyModule
        const yField = tile.yField || 'count'
        const trace = {
          type: tile.type === 'scatter' ? 'scatter' : tile.type === 'bar' ? 'bar' : 'scatter',
          mode:
            tile.type === 'scatter'
              ? 'markers'
              : tile.type === 'line' || tile.type === 'area'
                ? 'lines'
                : undefined,
          fill: tile.type === 'area' ? 'tozeroy' : undefined,
          x: rows.map((row) => row[tile.xField]),
          y: rows.map((row) => row[yField]),
          marker: { color: '#0f766e' },
          line: { color: '#0f766e', width: 3 },
        }
        return plotly.newPlot(
          element,
          [trace],
          {
            autosize: true,
            margin: { t: 12, r: 12, b: 48, l: 56 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: {
              family: 'Inter, ui-sans-serif, system-ui',
              color: '#26312f',
            },
          },
          { responsive: true, displayModeBar: false },
        )
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Plotly failed to render')
      })

    return () => {
      cancelled = true
      import('plotly.js-dist-min')
        .then((module) => {
          const plotly = module.default as PlotlyModule
          plotly.purge(element)
        })
        .catch(() => undefined)
    }
  }, [rows, tile.type, tile.xField, tile.yField])

  return (
    <article className="tile">
      <header className="tile-header">
        <div>
          <h3>{tile.title}</h3>
          <p>{tile.type}</p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => onRemove(tile.id)}
          aria-label={`Remove ${tile.title}`}
          title="Remove"
        >
          <Trash2 size={16} />
        </button>
      </header>
      {tile.type === 'table' ? <MiniTable rows={rows} /> : <div className="plot" ref={ref} />}
      {error ? <p className="inline-error">{error}</p> : null}
    </article>
  )
}

function MiniTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const columns = Object.keys(rows[0] ?? {}).slice(0, 6)

  return (
    <div className="table-shell compact">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row, index) => (
            <tr key={`${index}-${columns.join('-')}`}>
              {columns.map((column) => (
                <td key={column}>{String(row[column] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
