import {
  mockActionRuns,
  mockDeployments,
  mockEvents,
  mockGpuUtilization,
  mockPodMetrics,
  mockPods,
  mockRepos,
} from './mockData.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
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
      headers: { Accept: 'application/json', ...options?.headers },
    })
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    if (res.status === 204) return null
    return await res.json()
  } catch {
    return delay(fallback())
  }
}

export const ApiService = {
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
  getActionRuns(owner, repo, limit = 10) {
    return request(
      `/gitea/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?limit=${limit}`,
      () => mockActionRuns,
    )
  },
}
