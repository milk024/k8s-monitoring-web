import { Fragment } from 'react'
import { Loader } from './Loader.jsx'
import { EmptyState } from './EmptyState.jsx'

// onRowClick 을 주면 행 전체가 클릭 가능해진다. renderExpanded(row) 가 값을 돌려주면 그 행 아래에 펼쳐 보인다.
export function DataTable({ columns, rows, rowKey, loading, emptyTitle, emptyDescription, onRowClick, renderExpanded, maxHeight = 'max-h-[70vh]' }) {
  if (loading) return <Loader />
  if (!rows.length) return <EmptyState title={emptyTitle} description={emptyDescription} />

  return (
    <div className={`cw-surface cw-border ${maxHeight} overflow-auto rounded-md border`}>
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
          {rows.map((row) => {
            const key = typeof rowKey === 'function' ? rowKey(row) : row[rowKey]
            const expanded = renderExpanded?.(row)
            return (
              <Fragment key={key}>
                <tr
                  className={`hover:cw-surface-2 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="cw-text whitespace-nowrap px-4 py-2 tabular-nums">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
                {expanded && (
                  <tr className="cw-surface-2">
                    <td colSpan={columns.length} className="px-4 py-3">
                      {expanded}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
