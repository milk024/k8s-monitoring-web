import { Inbox } from 'lucide-react'

export function EmptyState({ icon: Icon = Inbox, title = '데이터가 없습니다', description }) {
  return (
    <div className="cw-muted flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Icon size={28} className="opacity-60" />
      <div className="cw-text text-sm font-medium">{title}</div>
      {description && <div className="cw-muted text-xs">{description}</div>}
    </div>
  )
}
