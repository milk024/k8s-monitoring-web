import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { Sidebar } from './Sidebar.jsx'
import { Topbar } from './Topbar.jsx'
import { useRealtimeConnection } from '../core/useRealtimeConnection.js'
import { useAdminAuth } from '../features/admin/services/adminAuth.js'
import { AdminLoginForm } from '../features/admin/components/AdminLoginForm.jsx'

// 모니터링 웹 전체를 관리자 로그인 뒤에 둔다 (admin-manager JWT, 탭 단위 sessionStorage, 8시간).
// 주의: 이건 화면 가림막이다. k8s-manager API(/api-k8s-m)는 아직 인증 없이 열려 있다.
export function DashboardLayout() {
  const token = useAdminAuth((s) => s.token)
  const expiresAt = useAdminAuth((s) => s.expiresAt)
  const logout = useAdminAuth((s) => s.logout)

  // 만료 시각이 되면 자동 로그아웃 (서버 JWT 만료와 맞춘다)
  useEffect(() => {
    if (!token || !expiresAt) return undefined
    const ms = expiresAt - Date.now()
    if (ms <= 0) {
      logout()
      return undefined
    }
    const id = setTimeout(() => {
      logout()
      toast.info('로그인이 만료되었습니다. 다시 로그인하세요.')
    }, Math.min(ms, 2 ** 31 - 1))
    return () => clearTimeout(id)
  }, [token, expiresAt, logout])

  if (!token) {
    return (
      <div className="cw-page flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="cw-text mb-4 text-center text-lg font-semibold">K8s Monitor</div>
          <AdminLoginForm />
        </div>
      </div>
    )
  }
  return <AuthedLayout />
}

function AuthedLayout() {
  useRealtimeConnection()

  return (
    <div className="cw-page flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
