import { useEffect, useMemo, useState } from 'react'
import { useAppState } from '../../core/AppState.ts'
import { fetchPods, transformPod } from './services/podService.js'
import { PodTable } from './components/PodTable.jsx'

export function PodsPage() {
  const selectedNamespace = useAppState((s) => s.selectedNamespace)
  const k8sPodsLive = useAppState((s) => s.k8sPodsLive)
  const [initialPods, setInitialPods] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchPods(selectedNamespace).then((data) => {
      setInitialPods(data)
      setLoading(false)
    })
  }, [selectedNamespace])

  const pods = useMemo(() => {
    if (!k8sPodsLive) return initialPods
    return k8sPodsLive
      .map(transformPod)
      .filter((p) => selectedNamespace === 'all' || p.namespace === selectedNamespace)
  }, [k8sPodsLive, initialPods, selectedNamespace])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="cw-text text-lg font-semibold">
          파드
          {k8sPodsLive && <span className="ml-2 text-xs font-normal text-[var(--cw-ok)]">● 실시간</span>}
        </h1>
        <p className="cw-muted text-sm">실행 중인 파드와 컨테이너 상태를 확인합니다.</p>
      </div>
      <PodTable pods={pods} loading={loading} />
    </div>
  )
}
