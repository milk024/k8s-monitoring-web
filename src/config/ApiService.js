import {
  mockBuilds,
  mockDeployments,
  mockEvents,
  mockGpuUtilization,
  mockPodMetrics,
  mockPods,
  mockRepos,
} from './mockData.js'
import { API_BASE_URL } from './endpoints.js'
import { useAdminAuth } from '../features/admin/services/adminAuth.js'

// k8s-manager API 는 로그인(admin-manager JWT)이 필요하다. 401 이면 로그아웃 → 로그인 화면
function authHeaders() {
  const { token } = useAdminAuth.getState()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function onUnauthorized() {
  useAdminAuth.getState().logout()
}

const BASE_URL = API_BASE_URL
const SIMULATED_LATENCY_MS = 250

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS))
}

function withNamespace(path, namespace) {
  if (!namespace || namespace === 'all') return path
  return `${path}?namespace=${encodeURIComponent(namespace)}`
}

async function request(path, fallback, options) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...authHeaders(), ...options?.headers },
    })
    if (res.status === 401) onUnauthorized()
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    if (res.status === 204) return null
    return await res.json()
  } catch {
    return delay(fallback())
  }
}

// 상세 화면용: 실패하면 mock 으로 바꾸지 않고 오류를 그대로 던진다 (로그·연관 리소스를 가짜로 보여주면 안 됨)
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function strictRequest(path, { text = false } = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, { headers: { Accept: text ? 'text/plain' : 'application/json', ...authHeaders() } })
  } catch {
    throw new ApiError(0, '관리 서버에 연결할 수 없습니다')
  }
  if (res.status === 401) onUnauthorized()
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(res.status, data?.error ?? `요청 실패 (${res.status})`)
  }
  return text ? res.text() : res.json()
}

function qs(params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const ApiService = {
  // ── 상세 화면 (mock 대체 없음) ──
  getBuildSummaries() {
    return strictRequest('/gitea/builds')
  },
  getArgoApps() {
    return strictRequest('/k8s/argocd/apps')
  },
  getPodRelated(namespace, name) {
    return strictRequest(`/k8s/pods/${encodeURIComponent(name)}/related${qs({ namespace })}`)
  },
  getPodEvents(namespace, pod) {
    return strictRequest(`/k8s/events${qs({ namespace, pod })}`)
  },
  getPodsStrict(namespace) {
    return strictRequest(`/k8s/pods${qs({ namespace })}`)
  },
  getPodLog(namespace, name, { container, previous, tailLines } = {}) {
    return strictRequest(`/k8s/pods/${encodeURIComponent(name)}/logs${qs({ namespace, container, previous, tailLines })}`, { text: true })
  },

  getPods(namespace) {
    return request(withNamespace('/k8s/pods', namespace), () => mockPods)
  },
  getDeployments(namespace) {
    return request(withNamespace('/k8s/deployments', namespace), () => mockDeployments)
  },
  getEvents(namespace) {
    return request(withNamespace('/k8s/events', namespace), () => mockEvents)
  },
  getPodMetrics(namespace) {
    return request(withNamespace('/monitor/pods', namespace), () => mockPodMetrics)
  },
  getGpuUtilization(namespace) {
    return request(withNamespace('/monitor/gpu', namespace), () => mockGpuUtilization)
  },
  getRepos() {
    return request('/gitea/repos', () => mockRepos)
  },
  registerWebhook(owner, repo, webhookUrl) {
    return request(
      `/gitea/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/webhook`,
      () => null,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webhookUrl }) },
    )
  },
  // Jenkins 빌드 이력 (k8s-manager 가 Gitea 커밋 상태 jenkins/build 로 만들어 줌)
  getBuilds(owner, repo, limit = 10) {
    return request(
      `/gitea/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/builds?limit=${limit}`,
      () => mockBuilds,
    )
  },
}
