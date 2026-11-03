import { cn } from '../../../shared/utils/cn.js'
import { EmptyState } from '../../../shared/components/EmptyState.jsx'

export function RecentEvents({ events }) {
  if (!events.length) return <EmptyState title="최근 이벤트가 없습니다" />

  return (
    <ul className="cw-border divide-y">
      {events.map((event, i) => (
        <li key={i} className="flex items-start gap-3 py-3">
          <span
            className={cn(
              'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
              event.type === 'Warning' ? 'bg-[var(--cw-warning)]' : 'bg-[var(--cw-info)]',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium cw-text">{event.reason}</span>
              <span className="shrink-0 text-xs cw-muted">{event.age}</span>
            </div>
            <p className="truncate text-xs cw-muted">{event.object}</p>
            <p className="mt-0.5 text-xs cw-muted">{event.message}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
