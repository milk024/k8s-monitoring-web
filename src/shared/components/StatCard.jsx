import { cn } from '../utils/cn.js'

const ACCENT_CLASSES = {
  neutral: 'border-l-[var(--cw-neutral)]',
  success: 'border-l-[var(--cw-ok)]',
  warning: 'border-l-[var(--cw-warning)]',
  danger: 'border-l-[var(--cw-alarm)]',
  info: 'border-l-[var(--cw-info)]',
}

const ICON_TONE_CLASSES = {
  neutral: 'cw-muted',
  success: 'text-[var(--cw-ok)]',
  warning: 'text-[var(--cw-warning)]',
  danger: 'text-[var(--cw-alarm)]',
  info: 'text-[var(--cw-info)]',
}

export function StatCard({ icon: Icon, label, value, sublabel, tone = 'neutral' }) {
  return (
    <div
      className={cn(
        'cw-surface cw-border rounded-md border border-l-4 p-4 shadow-sm',
        ACCENT_CLASSES[tone],
      )}
    >
      <div className="flex items-center justify-between">
        <span className="cw-muted text-xs font-semibold uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={15} className={ICON_TONE_CLASSES[tone]} />}
      </div>
      <div className="cw-text mt-2 text-[28px] font-medium leading-none tabular-nums">{value}</div>
      {sublabel && <div className="cw-muted mt-1.5 text-xs">{sublabel}</div>}
    </div>
  )
}
