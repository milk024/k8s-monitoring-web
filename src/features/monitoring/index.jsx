import { useEffect, useMemo, useState } from 'react'
import { useAppState } from '../../core/AppState.ts'
import { fetchGpuUtilization, fetchPodUsage, transformGpuMetric, transformPodUsage } from './services/monitoringService.js'
import { formatCpu } from '../../shared/utils/formatters.js'
import { PodUsageTable } from './components/PodUsageTable.jsx'
import { GpuUsageTable } from './components/GpuUsageTable.jsx'
import { TrendChart } from '../../shared/components/TrendChart.jsx'

const MAX_POINTS = 30
const GPU_POLL_MS = 10000
const TOP_N = 5

function formatTick(date) {
  return date.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function MonitoringPage() {
  const selectedNamespace = useAppState((s) => s.selectedNamespace)
  const podUsageLive = useAppState((s) => s.podUsageLive)
  const gpuUsageLive = useAppState((s) => s.gpuUsageLive)
  const autoRefresh = useAppState((s) => s.autoRefresh)
  const clusterStatus = useAppState((s) => s.clusterStatus)

  const [initialPodUsage, setInitialPodUsage] = useState([])
  const [podUsageLoading, setPodUsageLoading] = useState(true)
  const [polledGpus, setPolledGpus] = useState([])
  const [gpuLoading, setGpuLoading] = useState(true)

  const [podChartData, setPodChartData] = useState([])
  const [podSeriesKeys, setPodSeriesKeys] = useState([])
  const [gpuChartData, setGpuChartData] = useState([])
  const [gpuSeriesKeys, setGpuSeriesKeys] = useState([])
  const [gpuAllocatedOnly, setGpuAllocatedOnly] = useState(false)

  useEffect(() => {
    setPodUsageLoading(true)
    fetchPodUsage(selectedNamespace).then((data) => {
      setInitialPodUsage(data)
      setPodUsageLoading(false)
    })
  }, [selectedNamespace])

  // GPU는 metric.namespace/pod에 dcgm-exporter 자신의 위치(gpu-operator)가 찍혀서 그걸로는
  // 워크로드 필터링이 안 된다 — 그래서 항상 클러스터 전체로 받고, 실제 워크로드
  // 네임스페이스(exported_namespace/exported_pod)로 프론트에서 직접 필터링한다.
  // 갱신은 백엔드가 5초마다 보내는 'monitor:gpu' 소켓 이벤트(gpuUsageLive)가 기본이다.
  // 소켓이 끊겼거나 아직 첫 이벤트가 안 왔을 때만 REST 폴링으로 대신한다.
  const gpuLive = clusterStatus === 'connected' && gpuUsageLive !== null

  useEffect(() => {
    if (gpuLive) {
      setGpuLoading(false)
      return undefined
    }
    let intervalId
    function loadGpu() {
      fetchGpuUtilization('all').then((data) => {
        setPolledGpus(data)
        setGpuLoading(false)
      })
    }
    loadGpu()
    if (autoRefresh) {
      intervalId = setInterval(loadGpu, GPU_POLL_MS)
    }
    return () => clearInterval(intervalId)
  }, [autoRefresh, gpuLive])

  const podUsage = useMemo(() => {
    if (!podUsageLive) return initialPodUsage
    return podUsageLive
      .map(transformPodUsage)
      .filter((p) => selectedNamespace === 'all' || p.namespace === selectedNamespace)
  }, [podUsageLive, initialPodUsage, selectedNamespace])

  const gpus = useMemo(() => {
    if (!gpuLive) return polledGpus
    return gpuUsageLive.map(transformGpuMetric)
  }, [gpuLive, gpuUsageLive, polledGpus])

  const visibleGpus = useMemo(() => {
    return gpus.filter((g) => {
      if (selectedNamespace !== 'all' && g.podNamespace !== selectedNamespace) return false
      if (gpuAllocatedOnly && !g.podName) return false
      return true
    })
  }, [gpus, selectedNamespace, gpuAllocatedOnly])

  useEffect(() => {
    if (!podUsage.length) return
    const top = [...podUsage].sort((a, b) => b.cpuMillicores - a.cpuMillicores).slice(0, TOP_N)
    const point = { time: formatTick(new Date()) }
    top.forEach((p) => {
      point[p.pod] = p.cpuMillicores
    })
    setPodChartData((prev) => [...prev, point].slice(-MAX_POINTS))
    setPodSeriesKeys(top.map((p) => p.pod))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podUsage])

  useEffect(() => {
    if (!visibleGpus.length) return
    const point = { time: formatTick(new Date()) }
    const keys = visibleGpus.map((g) => {
      const key = `GPU ${g.gpu}`
      point[key] = g.utilization
      return key
    })
    setGpuChartData((prev) => [...prev, point].slice(-MAX_POINTS))
    setGpuSeriesKeys(keys)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleGpus])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cw-text text-lg font-semibold">모니터링</h1>
        <p className="cw-muted text-sm">
          컨테이너 리소스 사용량과 GPU 사용률을 확인합니다.
          {podUsageLive && <span className="ml-2 text-[var(--cw-ok)]">● 실시간</span>}
        </p>
      </div>

      <div>
        <h2 className="mb-2 cw-text text-sm font-semibold">파드 CPU 사용량 Top 5</h2>
        <TrendChart data={podChartData} seriesKeys={podSeriesKeys} valueFormatter={formatCpu} />
      </div>

      <div>
        <h2 className="mb-2 cw-text text-sm font-semibold">컨테이너 리소스 사용량</h2>
        <PodUsageTable usage={podUsage} loading={podUsageLoading} />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="cw-text text-sm font-semibold">
            GPU 사용률
            <span className="cw-muted ml-2 text-xs font-normal">
              {gpuUsageLive ? '● 실시간' : `${GPU_POLL_MS / 1000}초 주기 폴링`}
            </span>
          </h2>
          <label className="cw-muted flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={gpuAllocatedOnly}
              onChange={(e) => setGpuAllocatedOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded"
              style={{ accentColor: 'var(--cw-accent)' }}
            />
            할당된 GPU만 보기
          </label>
        </div>
        <p className="cw-muted mb-2 text-xs">
          네임스페이스 필터는 실제로 그 GPU를 쓰는 워크로드(exported_pod) 기준으로 적용됩니다.
        </p>
        <TrendChart data={gpuChartData} seriesKeys={gpuSeriesKeys} valueFormatter={(v) => `${Math.round(v)}%`} />
        <div className="mt-3">
          <GpuUsageTable gpus={visibleGpus} loading={gpuLoading} />
        </div>
      </div>
    </div>
  )
}
