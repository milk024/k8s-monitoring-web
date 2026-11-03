import { cn } from '../../../shared/utils/cn.js'
import { EmptyState } from '../../../shared/components/EmptyState.jsx'
import { formatAge } from '../../../shared/utils/formatters.js'
import { AlertSeverityBadge } from './AlertSeverityBadge.jsx'
import { AlertTriangle } from 'lucide-react'

export function AlertsTable({ alerts }) {
  if (!alerts.length) {
    return <EmptyState icon={AlertTriangle} title="발생한 알람이 없습니다" description="Alertmanager에서 알람이 오면 여기에 표시됩니다." />
  }

  return (
    <ul className="cw-border divide-y">
      {alerts.map((alert) => {
        const firing = alert.status === 'firing'
        return (
          <li key={alert.fingerprint ?? `${alert.labels?.alertname}-${alert.receivedAt}`} className="flex items-start gap-3 py-3">
            <span
              className={cn(
                'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                firing ? 'bg-[var(--cw-alarm)]' : 'bg-[var(--cw-ok)]',
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium cw-text">{alert.labels?.alertname ?? '알 수 없는 알람'}</span>
                <AlertSeverityBadge severity={alert.labels?.severity} />
                <span
                  className={cn(
                    'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                    firing ? 'bg-[var(--cw-alarm-bg)] text-[var(--cw-alarm)]' : 'bg-[var(--cw-ok-bg)] text-[var(--cw-ok)]',
                  )}
                >
                  {firing ? 'FIRING' : 'RESOLVED'}
                </span>
                <span className="ml-auto shrink-0 text-xs cw-muted">{formatAge(alert.startsAt)} 전</span>
              </div>
              {alert.annotations?.summary && <p className="mt-0.5 truncate text-xs cw-text">{alert.annotations.summary}</p>}
              {alert.annotations?.description && (
                <p className="mt-0.5 text-xs cw-muted">{alert.annotations.description}</p>
              )}
              {alert.labels?.namespace && (
                <p className="mt-0.5 text-xs cw-muted">namespace: {alert.labels.namespace}</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
