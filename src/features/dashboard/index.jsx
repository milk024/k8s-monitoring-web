import { useEffect, useState } from 'react'
import { AlertTriangle, Boxes, Layers, Server } from 'lucide-react'
import { StatCard } from '../../shared/components/StatCard.jsx'
import { Loader } from '../../shared/components/Loader.jsx'
import { fetchDashboardData } from './services/dashboardService.js'
import { TopConsumers } from './components/TopConsumers.jsx'
import { RecentEvents } from './components/RecentEvents.jsx'

export function DashboardPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchDashboardData().then((result) => {
      if (!cancelled) setData(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!data) return <Loader />

  const { summary, events, topConsumers } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cw-text text-lg font-semibold">클러스터 개요</h1>
        <p className="cw-muted text-sm">전체 리소스 상태를 한눈에 확인하세요.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Boxes}
          label="파드"
          value={`${summary.pods.running}/${summary.pods.total}`}
          sublabel={summary.pods.failing > 0 ? `${summary.pods.failing}개 문제 발생` : '모두 정상'}
          tone={summary.pods.failing > 0 ? 'danger' : 'success'}
        />
        <StatCard
          icon={Layers}
          label="디플로이먼트"
          value={`${summary.deployments.healthy}/${summary.deployments.total}`}
          sublabel="정상 배포"
          tone={summary.deployments.healthy === summary.deployments.total ? 'success' : 'warning'}
        />
        <StatCard icon={Server} label="네임스페이스" value={summary.namespaces.total} sublabel="파드가 실행 중인 네임스페이스" tone="info" />
        <StatCard
          icon={AlertTriangle}
          label="경고 이벤트"
          value={summary.warningEvents}
          sublabel="최근 발생"
          tone={summary.warningEvents > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="cw-surface cw-border rounded-md border p-4 lg:col-span-1">
          <h2 className="mb-2 cw-text text-sm font-semibold">리소스 사용량 Top 5</h2>
          <TopConsumers consumers={topConsumers} />
        </div>

        <div className="cw-surface cw-border rounded-md border p-4 lg:col-span-2">
          <h2 className="mb-2 cw-text text-sm font-semibold">최근 이벤트</h2>
          <RecentEvents events={events} />
        </div>
      </div>
    </div>
  )
}
