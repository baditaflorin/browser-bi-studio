/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __GIT_COMMIT__: string

declare module 'plotly.js-dist-min' {
  const plotly: {
    newPlot: (
      element: HTMLElement,
      traces: unknown[],
      layout: Record<string, unknown>,
      config: Record<string, unknown>,
    ) => Promise<unknown>
    purge: (element: HTMLElement) => void
  }

  export default plotly
}
