import { NavLink } from 'react-router-dom'
import { Activity, AlertTriangle, Boxes, GitBranch, LayoutDashboard, Layers, Settings, Box } from 'lucide-react'
import { cn } from '../shared/utils/cn.js'
import { useAppState } from '../core/AppState.ts'

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/pods', label: '파드', icon: Box },
  { to: '/deployments', label: '디플로이먼트', icon: Layers },
  { to: '/monitoring', label: '모니터링', icon: Activity },
  { to: '/namespaces', label: '네임스페이스', icon: Boxes },
  { to: '/gitea', label: 'Gitea', icon: GitBranch },
  { to: '/alerts', label: '알람', icon: AlertTriangle },
  { to: '/settings', label: '설정', icon: Settings },
]

export function Sidebar() {
  const firingCount = useAppState((s) => s.alerts.filter((a) => a.status === 'firing').length)

  return (
    <aside className="cw-surface cw-border flex w-60 shrink-0 flex-col border-r">
      <div className="cw-border flex h-14 items-center gap-2 border-b px-4">
        <div className="cw-accent-bg flex h-7 w-7 items-center justify-center rounded-md text-white">
          <Boxes size={16} />
        </div>
        <span className="cw-text text-sm font-semibold">K8s Monitor</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-r-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'cw-accent-bg-soft cw-accent-text border-l-[var(--cw-accent)] font-semibold'
                  : 'cw-muted border-l-transparent hover:cw-surface-2',
              )
            }
          >
            <Icon size={16} />
            {label}
            {to === '/alerts' && firingCount > 0 && (
              <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--cw-alarm)] px-1 text-[10px] font-semibold text-white">
                {firingCount > 99 ? '99+' : firingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
