import { cn } from '../../../shared/utils/cn.js'

const SEVERITY_CLASSES = {
  critical: 'bg-[var(--cw-alarm-bg)] text-[var(--cw-alarm)]',
  warning: 'bg-[var(--cw-warning-bg)] text-[var(--cw-warning)]',
  info: 'bg-[var(--cw-info-bg)] text-[var(--cw-info)]',
}

export function AlertSeverityBadge({ severity }) {
  const key = (severity ?? '').toLowerCase()
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium uppercase',
        SEVERITY_CLASSES[key] ?? 'bg-[var(--cw-neutral-bg)] text-[var(--cw-neutral)]',
      )}
    >
      {severity ?? 'unknown'}
    </span>
  )
}
