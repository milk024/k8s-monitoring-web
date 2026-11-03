import { useMemo, useState } from 'react'
import { useAppState } from '../../core/AppState.ts'
import { AlertsTable } from './components/AlertsTable.jsx'

export function AlertsPage() {
  const alerts = useAppState((s) => s.alerts)
  const [firingOnly, setFiringOnly] = useState(true)

  const firingCount = useMemo(() => alerts.filter((a) => a.status === 'firing').length, [alerts])
  const visibleAlerts = useMemo(
    () => (firingOnly ? alerts.filter((a) => a.status === 'firing') : alerts),
    [alerts, firingOnly],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cw-text text-lg font-semibold">알람</h1>
        <p className="cw-muted text-sm">
          Alertmanager에서 전달된 알람입니다.{' '}
          {firingCount > 0 ? (
            <span className="text-[var(--cw-alarm)]">현재 {firingCount}건 발생 중</span>
          ) : (
            <span className="text-[var(--cw-ok)]">발생 중인 알람 없음</span>
          )}
        </p>
      </div>

      <div className="cw-surface cw-border rounded-md border p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="cw-text text-sm font-semibold">알람 목록</h2>
          <label className="cw-muted flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={firingOnly}
              onChange={(e) => setFiringOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded"
              style={{ accentColor: 'var(--cw-accent)' }}
            />
            발생 중인 알람만 보기
          </label>
        </div>
        <AlertsTable alerts={visibleAlerts} />
      </div>
    </div>
  )
}
