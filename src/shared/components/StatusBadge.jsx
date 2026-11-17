import { cn } from '../utils/cn.js'
import { toneForStatus } from '../../config/ResourceType.js'

const TONE_CLASSES = {
  success: 'bg-[var(--cw-ok-bg)] text-[var(--cw-ok)]',
  warning: 'bg-[var(--cw-warning-bg)] text-[var(--cw-warning)]',
  danger: 'bg-[var(--cw-alarm-bg)] text-[var(--cw-alarm)]',
  info: 'bg-[var(--cw-info-bg)] text-[var(--cw-info)]',
  neutral: 'bg-[var(--cw-neutral-bg)] text-[var(--cw-neutral)]',
}

// label 을 주면 상태 값 대신 그 글자를 보여준다 (색은 status 기준)
export function StatusBadge({ status, label }) {
  const tone = toneForStatus(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? status}
    </span>
  )
}
