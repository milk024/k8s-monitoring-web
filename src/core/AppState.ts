import { create } from 'zustand'

const MAX_FEED_ITEMS = 20
const MAX_ALERT_ITEMS = 50
const THEME_STORAGE_KEY = 'k8s-monitor-theme'

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

const initialTheme = getInitialTheme()
applyTheme(initialTheme)

export const useAppState = create((set) => ({
  namespaces: [],
  selectedNamespace: 'all',
  clusterStatus: 'connecting',
  autoRefresh: true,
  refreshInterval: 15000,
  theme: initialTheme,

  podUsageLive: null,
  gpuUsageLive: null,
  // 'k8s:pods' 이벤트로 파드 목록(원본 K8s 객체) 자체가 실시간으로 들어온다 —
  // monitor:pods(CPU/메모리 사용량)와는 별개 채널.
  k8sPodsLive: null,
  alerts: [],
  giteaPushes: [],
  // 'gitea:actions'는 웹훅을 받은 서버 인스턴스에 연결된 클라이언트에게만 온다(단일 replica
  // 전제) — repo/커밋 단위 빌드 결과 알림용으로 최근 것만 몇 개 들고 있는다.
  giteaActionsEvents: [],

  setNamespaces: (namespaces) => set({ namespaces }),
  setSelectedNamespace: (selectedNamespace) => set({ selectedNamespace }),
  setClusterStatus: (clusterStatus) => set({ clusterStatus }),
  toggleAutoRefresh: () => set((state) => ({ autoRefresh: !state.autoRefresh })),
  setRefreshInterval: (refreshInterval) => set({ refreshInterval }),
  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === 'dark' ? 'light' : 'dark'
      applyTheme(theme)
      return { theme }
    }),

  setPodUsageLive: (podUsageLive) => set({ podUsageLive }),
  setGpuUsageLive: (gpuUsageLive) => set({ gpuUsageLive }),
  setK8sPodsLive: (k8sPodsLive) => set({ k8sPodsLive }),
  // Alertmanager는 같은 알람의 firing/resolved 전이를 매번 새 웹훅 호출로 보낸다 —
  // fingerprint로 같은 알람이면 새 항목을 쌓지 않고 상태만 갱신한다(맨 앞으로 끌어올림).
  pushAlert: (alert) =>
    set((state) => {
      const entry = { ...alert, receivedAt: Date.now() }
      const rest = alert.fingerprint
        ? state.alerts.filter((a) => a.fingerprint !== alert.fingerprint)
        : state.alerts
      return { alerts: [entry, ...rest].slice(0, MAX_ALERT_ITEMS) }
    }),
  pushGiteaPush: (push) =>
    set((state) => ({
      giteaPushes: [{ ...push, receivedAt: Date.now() }, ...state.giteaPushes].slice(0, MAX_FEED_ITEMS),
    })),
  pushGiteaActionsEvent: (event) =>
    set((state) => ({
      giteaActionsEvents: [{ ...event, receivedAt: Date.now() }, ...state.giteaActionsEvents].slice(
        0,
        MAX_FEED_ITEMS,
      ),
    })),
}))
