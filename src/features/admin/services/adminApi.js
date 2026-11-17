import { ADMIN_API_BASE_URL } from '../../../config/endpoints.js'
import { useAdminAuth } from './adminAuth.js'

// admin-manager API (게이트웨이 /api-admin → admin-manager /api).
// 모니터링 API 와 달리 실패 시 mock 으로 대체하지 않는다 — 권한 작업이라 결과를 그대로 보여줘야 한다.
export class AdminApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const { token } = useAdminAuth.getState()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new AdminApiError(0, '관리 서버에 연결할 수 없습니다')
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // 토큰 만료/위조 → 로그인 화면으로
    if (res.status === 401 && auth) useAdminAuth.getState().logout()
    throw new AdminApiError(res.status, data?.error ?? `요청 실패 (${res.status})`)
  }
  return data
}

export const AdminApi = {
  login(username, password) {
    return request('/auth/login', { method: 'POST', body: { username, password }, auth: false })
  },
  getTemplates() {
    return request('/accounts/rbac-templates')
  },
  getNamespaces() {
    return request('/accounts/namespaces')
  },
  getAccounts() {
    return request('/accounts')
  },
  issueAccount({ namespace, name, rbacTemplate }) {
    return request('/accounts', { method: 'POST', body: { namespace, name, rbacTemplate } })
  },
  getAuditLog({ action, result, before, limit } = {}) {
    const q = new URLSearchParams()
    if (action) q.set('action', action)
    if (result) q.set('result', result)
    if (before) q.set('before', String(before))
    if (limit) q.set('limit', String(limit))
    const qs = q.toString()
    return request(`/audit${qs ? `?${qs}` : ''}`)
  },
  getGiteaUsers() {
    return request('/gitea/users')
  },
  getGiteaTeams() {
    return request('/gitea/teams')
  },
  createGiteaUser({ username, email, fullName, teams }) {
    return request('/gitea/users', { method: 'POST', body: { username, email, fullName, teams } })
  },
  setGiteaLogin(username, prohibitLogin) {
    return request(`/gitea/users/${encodeURIComponent(username)}/login`, { method: 'PATCH', body: { prohibitLogin } })
  },
  resetGiteaPassword(username) {
    return request(`/gitea/users/${encodeURIComponent(username)}/reset-password`, { method: 'POST', body: {} })
  },
  addGiteaTeamMember(team, username) {
    return request(`/gitea/teams/${encodeURIComponent(team)}/members/${encodeURIComponent(username)}`, { method: 'PUT' })
  },
  removeGiteaTeamMember(team, username) {
    return request(`/gitea/teams/${encodeURIComponent(team)}/members/${encodeURIComponent(username)}`, { method: 'DELETE' })
  },
  // ── 네임스페이스 YAML 관리 (화이트리스트 Kind 만, ArgoCD 관리 리소스는 서버가 수정·삭제 거부 409) ──
  getManifestKinds() {
    return request('/manifests/kinds')
  },
  listManifests(namespace, kind) {
    return request(`/manifests?namespace=${encodeURIComponent(namespace)}&kind=${encodeURIComponent(kind)}`)
  },
  getManifest(namespace, kind, name) {
    return request(`/manifests/one?namespace=${encodeURIComponent(namespace)}&kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(name)}`)
  },
  applyManifest(manifest) {
    return request('/manifests', { method: 'PUT', body: manifest })
  },
  deleteManifest({ apiVersion, kind, namespace, name }) {
    const q = new URLSearchParams({ apiVersion, kind, namespace, name })
    return request(`/manifests?${q}`, { method: 'DELETE' })
  },
  getManifestHistory(namespace) {
    return request(`/manifests/history?namespace=${encodeURIComponent(namespace)}`)
  },
  revokeAccount(namespace, name) {
    return request(`/accounts/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`, { method: 'DELETE' })
  },
}
