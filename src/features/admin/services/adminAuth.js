import { create } from 'zustand'

// admin-manager 관리자 로그인 상태.
// 토큰은 sessionStorage 에 둔다 — 탭/브라우저를 닫으면 사라지고, 다른 탭과 공유되지 않는다.
// (localStorage 보다 노출 시간이 짧다. 서버 JWT 만료는 8시간)
const STORAGE_KEY = 'k8s-monitor-admin-session'

function decodeExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session.token || (session.expiresAt && session.expiresAt <= Date.now())) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

const initial = loadSession()

export const useAdminAuth = create((set) => ({
  token: initial?.token ?? null,
  username: initial?.username ?? null,
  expiresAt: initial?.expiresAt ?? null,

  login: (token, username) => {
    const session = { token, username, expiresAt: decodeExp(token) }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      // 저장이 막힌 환경이면 메모리에만 둔다
    }
    set(session)
  },

  logout: () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    set({ token: null, username: null, expiresAt: null })
  },
}))
