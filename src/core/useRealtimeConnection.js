import { useEffect } from 'react'
import { toast } from 'sonner'
import { socket } from './socket.js'
import { useAppState } from './AppState.ts'
import { useAdminAuth } from '../features/admin/services/adminAuth.js'

export function useRealtimeConnection() {
  const setClusterStatus = useAppState((s) => s.setClusterStatus)
  const setPodUsageLive = useAppState((s) => s.setPodUsageLive)
  const setGpuUsageLive = useAppState((s) => s.setGpuUsageLive)
  const setK8sPodsLive = useAppState((s) => s.setK8sPodsLive)
  const pushAlert = useAppState((s) => s.pushAlert)
  const pushGiteaPush = useAppState((s) => s.pushGiteaPush)
  const pushCiBuildEvent = useAppState((s) => s.pushCiBuildEvent)
  const token = useAdminAuth((s) => s.token)

  // 로그인 토큰으로 소켓 연결. 토큰이 바뀌거나 로그아웃하면 끊는다
  useEffect(() => {
    if (!token) return undefined
    function handleConnectError(err) {
      if (err?.data?.code === 401) {
        useAdminAuth.getState().logout()
        toast.error(`실시간 연결 인증 실패: ${err.message}`)
      }
    }
    socket.on('connect_error', handleConnectError)
    socket.auth = { token }
    socket.connect()
    return () => {
      socket.off('connect_error', handleConnectError)
      socket.disconnect()
    }
  }, [token])

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
    // 백엔드 monitorService 가 5초마다 보낸다. 모니터링 페이지는 이 값이 있으면 GPU REST 폴링을 멈춘다.
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
    // Jenkins 빌드 결과 (Gitea 커밋 상태 jenkins/build). payload = 빌드 1건
    function handleCiBuild(build) {
      pushCiBuildEvent(build)
      const label = `${build?.repo ?? ''} #${build?.buildNumber ?? '?'}`
      const description = `${build?.sha?.slice(0, 7) ?? ''} ${build?.title ?? ''}`.trim()
      if (build?.status === 'failure' || build?.status === 'error') {
        toast.error(`${label} 빌드 실패`, { description })
      } else if (build?.status === 'success') {
        toast.success(`${label} 빌드 완료`, { description })
      } else if (build?.status === 'pending') {
        toast.info(`${label} 빌드 시작`, { description })
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
    socket.on('ci:build', handleCiBuild)

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
      socket.off('ci:build', handleCiBuild)
    }
  }, [
    setClusterStatus,
    setPodUsageLive,
    setGpuUsageLive,
    setK8sPodsLive,
    pushAlert,
    pushGiteaPush,
    pushCiBuildEvent,
  ])
}
