import { ClusterConnectionForm } from './components/ClusterConnectionForm.jsx'

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="cw-text text-lg font-semibold">설정</h1>
        <p className="cw-muted text-sm">클러스터 연결 및 대시보드 동작을 설정합니다.</p>
      </div>
      <ClusterConnectionForm />
    </div>
  )
}
