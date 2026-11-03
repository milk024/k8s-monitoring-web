import { useEffect } from 'react'
import { toast } from 'sonner'
import { socket } from './socket.js'
import { useAppState } from './AppState.ts'

export function useRealtimeConnection() {
  const setClusterStatus = useAppState((s) => s.setClusterStatus)
  const setPodUsageLive = useAppState((s) => s.setPodUsageLive)
  const setGpuUsageLive = useAppState((s) => s.setGpuUsageLive)
  const setK8sPodsLive = useAppState((s) => s.setK8sPodsLive)
  const pushAlert = useAppState((s) => s.pushAlert)
  const pushGiteaPush = useAppState((s) => s.pushGiteaPush)
  const pushGiteaActionsEvent = useAppState((s) => s.pushGiteaActionsEvent)

  useEffect(() => {
    function handleConnect() {
      setClusterStatus('connected')
    }
    function handleDisconnect() {
      setClusterStatus('disconnected')
    }
    function handleMonitorPods(payload) {
      setPodUsageLive(payload?.pods ?? [])
      toast.dismiss('monitor-error')
    }
    // 백엔드 후속 작업 대기 중 — 아직 emit 안 되면 아무 것도 안 오니 gpuUsageLive는 계속 null.
    function handleMonitorGpu(payload) {
      setGpuUsageLive(payload?.gpus ?? [])
      toast.dismiss('monitor-error')
    }
    function handleMonitorError(payload) {
      // id로 고정해 폴링 주기(기본 5s)마다 반복되는 동일 오류가 toast를 계속 쌓지 않도록 함
      toast.error(`모니터링 폴링 실패: ${payload?.message ?? '알 수 없는 오류'}`, { id: 'monitor-error' })
    }
    function handleAlertTriggered(alerts) {
      const list = Array.isArray(alerts) ? alerts : [alerts]
      list.forEach((alert) => {
        pushAlert(alert)
        if (alert?.status === 'resolved') return
        const notify = alert?.labels?.severity === 'critical' ? toast.error : toast.warning
        notify(alert?.labels?.alertname ?? '클러스터 알람 발생', {
          description: alert?.annotations?.summary,
        })
      })
    }
    function handleGiteaPush(summary) {
      pushGiteaPush(summary)
      toast.info(`${summary?.repo ?? 'Gitea'} push: ${summary?.ref ?? ''}`)
    }
    function handleK8sPods(payload) {
      setK8sPodsLive(payload?.pods ?? [])
    }
    function handleGiteaActions(payload) {
      pushGiteaActionsEvent(payload)
      const runs = payload?.runs ?? []
      const label = `${payload?.owner}/${payload?.repo}`
      if (runs.some((r) => r.status === 'failure')) {
        toast.error(`${label} 빌드 실패`, { description: payload?.sha?.slice(0, 7) })
      } else if (runs.length && runs.every((r) => r.status === 'success')) {
        toast.success(`${label} 빌드 완료`, { description: payload?.sha?.slice(0, 7) })
      }
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('monitor:pods', handleMonitorPods)
    socket.on('monitor:gpu', handleMonitorGpu)
    socket.on('monitor:error', handleMonitorError)
    socket.on('alert:triggered', handleAlertTriggered)
    socket.on('gitea:push', handleGiteaPush)
    socket.on('k8s:pods', handleK8sPods)
    socket.on('gitea:actions', handleGiteaActions)

    if (socket.connected) handleConnect()

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('monitor:pods', handleMonitorPods)
      socket.off('monitor:gpu', handleMonitorGpu)
      socket.off('monitor:error', handleMonitorError)
      socket.off('alert:triggered', handleAlertTriggered)
      socket.off('gitea:push', handleGiteaPush)
      socket.off('k8s:pods', handleK8sPods)
      socket.off('gitea:actions', handleGiteaActions)
    }
  }, [
    setClusterStatus,
    setPodUsageLive,
    setGpuUsageLive,
    setK8sPodsLive,
    pushAlert,
    pushGiteaPush,
    pushGiteaActionsEvent,
  ])
}
