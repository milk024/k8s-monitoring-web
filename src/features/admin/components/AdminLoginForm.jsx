import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AdminApi } from '../services/adminApi.js'
import { useAdminAuth } from '../services/adminAuth.js'

const inputClass = 'w-full cw-surface-2 cw-border cw-text rounded-md border px-3 py-2 text-sm'

export function AdminLoginForm() {
  const login = useAdminAuth((s) => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await AdminApi.login(username.trim(), password)
      login(result.token, result.username)
    } catch (err) {
      setError(err.message)
    } finally {
      setPassword('')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="cw-surface cw-border max-w-sm space-y-4 rounded-md border p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="cw-accent-text" />
        <h2 className="cw-text text-sm font-semibold">관리자 로그인</h2>
      </div>
      <p className="cw-muted text-xs">
        모니터링 화면은 관리자만 볼 수 있습니다. 로그인은 이 탭에서만 유지되며 8시간 뒤 만료됩니다.
      </p>
      <div>
        <label className="cw-muted mb-1.5 block text-xs font-medium" htmlFor="admin-username">아이디</label>
        <input
          id="admin-username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="cw-muted mb-1.5 block text-xs font-medium" htmlFor="admin-password">비밀번호</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      {error && <p className="text-xs text-[var(--cw-alarm)]">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="cw-accent-bg w-full rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
