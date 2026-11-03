import { useAppState } from '../../../core/AppState.ts'

const REFRESH_OPTIONS = [5000, 15000, 30000, 60000]

export function ClusterConnectionForm() {
  const { refreshInterval, setRefreshInterval, autoRefresh, toggleAutoRefresh, clusterStatus } = useAppState()
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

  return (
    <div className="max-w-lg space-y-6 cw-surface cw-border rounded-md border p-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium cw-muted">API 엔드포인트</label>
        <input
          readOnly
          value={apiBaseUrl}
          className="w-full cw-surface-2 cw-border cw-text rounded-md border px-3 py-2 text-sm"
        />
        <p className="mt-1.5 text-xs cw-muted">
          VITE_API_BASE_URL 환경 변수로 변경할 수 있습니다. 백엔드가 연결되지 않으면 목 데이터로 동작합니다.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium cw-muted">연결 상태</label>
        <p className="text-sm cw-text">{clusterStatus}</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium cw-muted">자동 새로고침 주기</label>
        <select
          value={refreshInterval}
          onChange={(e) => setRefreshInterval(Number(e.target.value))}
          disabled={!autoRefresh}
          className="w-full cw-surface-2 cw-border cw-text rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        >
          {REFRESH_OPTIONS.map((ms) => (
            <option key={ms} value={ms}>
              {ms / 1000}초
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm cw-text">
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={toggleAutoRefresh}
          className="h-4 w-4 rounded"
          style={{ accentColor: 'var(--cw-accent)' }}
        />
        자동 새로고침 사용
      </label>
    </div>
  )
}
