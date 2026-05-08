import { useEffect, useRef, useState } from 'react'
import type { QueryResult } from '../types'
import { defaultFieldSelection } from '../features/dashboard/charting'

type ObservablePlotModule = {
  plot: (options: Record<string, unknown>) => HTMLElement | SVGSVGElement
  barY: (data: unknown[], options: Record<string, unknown>) => unknown
  ruleY: (values: number[]) => unknown
}

export function ObservablePreview({ result }: { result?: QueryResult }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!result || !ref.current) {
      return undefined
    }

    let disposed = false
    const element = ref.current
    element.innerHTML = ''

    import('@observablehq/plot')
      .then((module) => {
        if (disposed) {
          return
        }

        const plot = module as unknown as ObservablePlotModule
        const fields = defaultFieldSelection(result)
        const graphic = plot.plot({
          height: 180,
          marginLeft: 54,
          marginBottom: 44,
          color: { legend: false },
          marks: [
            plot.ruleY([0]),
            plot.barY(result.rows.slice(0, 30), {
              x: fields.xField,
              y: fields.yField || undefined,
              fill: '#2563eb',
            }),
          ],
        })
        element.append(graphic)
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Observable Plot failed to render')
      })

    return () => {
      disposed = true
      element.innerHTML = ''
    }
  }, [result])

  if (!result) {
    return null
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Observable Plot</h2>
        <span>preview</span>
      </div>
      <div className="observable-plot" ref={ref} />
      {error ? <p className="inline-error">{error}</p> : null}
    </section>
  )
}
