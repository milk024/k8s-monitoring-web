import { useEffect, useState } from 'react'
import { LogOut, Moon, RefreshCw, Sun } from 'lucide-react'
import { useAdminAuth } from '../features/admin/services/adminAuth.js'
import { useAppState } from '../core/AppState.ts'
import { fetchNamespaces } from '../features/namespaces/services/namespaceService.js'
import { cn } from '../shared/utils/cn.js'

export function Topbar() {
  const {
    namespaces,
    selectedNamespace,
    clusterStatus,
    autoRefresh,
    theme,
    setNamespaces,
    setSelectedNamespace,
    toggleAutoRefresh,
    toggleTheme,
  } = useAppState()
  const [refreshTick, setRefreshTick] = useState(0)
  const { username, expiresAt, logout } = useAdminAuth()

  useEffect(() => {
    fetchNamespaces().then(setNamespaces)
  }, [setNamespaces])

  const statusStyles = {
    connected: 'bg-[var(--cw-ok-bg)] text-[var(--cw-ok)]',
    connecting: 'bg-[var(--cw-warning-bg)] text-[var(--cw-warning)]',
    disconnected: 'bg-[var(--cw-alarm-bg)] text-[var(--cw-alarm)]',
  }
  const statusLabels = {
    connected: '실시간 연결됨',
    connecting: '연결 중...',
    disconnected: '연결 끊김',
  }

  return (
    <header className="cw-surface cw-border flex h-14 shrink-0 items-center justify-between border-b px-6">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium',
            statusStyles[clusterStatus] ?? statusStyles.connected,
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusLabels[clusterStatus] ?? clusterStatus}
        </span>

        <select
          value={selectedNamespace}
          onChange={(e) => setSelectedNamespace(e.target.value)}
          className="cw-surface cw-border cw-text rounded-md border px-3 py-1.5 text-sm focus:border-[var(--cw-accent)] focus:outline-none"
        >
          <option value="all">전체 네임스페이스</option>
          {namespaces.map((ns) => (
            <option key={ns.name} value={ns.name}>
              {ns.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label className="cw-muted flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={toggleAutoRefresh}
            className="h-3.5 w-3.5 rounded"
            style={{ accentColor: 'var(--cw-accent)' }}
          />
          자동 새로고침
        </label>
        <button
          type="button"
          onClick={() => setRefreshTick((t) => t + 1)}
          className="cw-surface cw-border cw-text flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:cw-surface-2"
        >
          <RefreshCw size={13} key={refreshTick} />
          새로고침
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="테마 전환"
          className="cw-surface cw-border cw-muted flex h-8 w-8 items-center justify-center rounded-md border hover:cw-surface-2"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <span className="cw-muted text-xs" title={expiresAt ? `${new Date(expiresAt).toLocaleString()} 만료` : ''}>
          {username}
        </span>
        <button
          type="button"
          onClick={logout}
          className="cw-surface cw-border cw-text flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:cw-surface-2"
        >
          <LogOut size={13} /> 로그아웃
        </button>
      </div>
    </header>
  )
}
