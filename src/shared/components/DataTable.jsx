import { Loader } from './Loader.jsx'
import { EmptyState } from './EmptyState.jsx'

export function DataTable({ columns, rows, rowKey, loading, emptyTitle, emptyDescription }) {
  if (loading) return <Loader />
  if (!rows.length) return <EmptyState title={emptyTitle} description={emptyDescription} />

  return (
    <div className="cw-surface cw-border max-h-[70vh] overflow-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="cw-surface-2 cw-border cw-muted sticky top-0 z-10 border-b text-[11px] font-semibold uppercase tracking-wide">
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-2.5">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="cw-border divide-y">
          {rows.map((row) => (
            <tr key={row[rowKey]} className="hover:cw-surface-2 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="cw-text whitespace-nowrap px-4 py-2 tabular-nums">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
