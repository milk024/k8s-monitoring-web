import { Loader2 } from 'lucide-react'

export function Loader({ label = '불러오는 중...' }) {
  return (
    <div className="cw-muted flex items-center justify-center gap-2 py-16 text-sm">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  )
}
