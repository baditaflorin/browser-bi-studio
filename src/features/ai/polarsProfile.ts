import type { ColumnProfile, DataRow } from '../../types'

type PyodideModule = {
  loadPyodide: (options: { indexURL: string }) => Promise<{
    loadPackage: (packages: string[]) => Promise<void>
    runPythonAsync: (code: string) => Promise<unknown>
    globals: {
      set: (name: string, value: unknown) => void
    }
  }>
}

export async function profileWithPolars(rows: DataRow[], columns: ColumnProfile[]) {
  try {
    const module = (await import('pyodide')) as unknown as PyodideModule
    const pyodide = await module.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.4/full/',
    })
    await pyodide.loadPackage(['micropip'])
    pyodide.globals.set('rows_json', JSON.stringify(rows))
    pyodide.globals.set('columns_json', JSON.stringify(columns))

    const result = await pyodide.runPythonAsync(`
import json

rows = json.loads(rows_json)
columns = json.loads(columns_json)

profile = {
  "engine": "pyodide",
  "rows": len(rows),
  "columns": len(columns),
  "numeric_columns": [column["name"] for column in columns if column["type"] == "number"],
  "dimension_columns": [column["name"] for column in columns if column["type"] != "number"],
}

json.dumps(profile)
`)

    return typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  } catch {
    return JSON.stringify(localProfile(rows, columns), null, 2)
  }
}

function localProfile(rows: DataRow[], columns: ColumnProfile[]) {
  return {
    engine: 'local-js-fallback',
    rows: rows.length,
    columns: columns.length,
    numeric_columns: columns
      .filter((column) => column.type === 'number')
      .map((column) => column.name),
    dimension_columns: columns
      .filter((column) => column.type !== 'number')
      .map((column) => column.name),
  }
}
