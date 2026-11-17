import { useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, Lock, LockOpen, Plus, RefreshCw, ShieldCheck, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '../../../shared/components/DataTable.jsx'
import { formatAge } from '../../../shared/utils/formatters.js'
import { AdminApi } from '../services/adminApi.js'

const inputClass = 'w-full cw-surface-2 cw-border cw-text rounded-md border px-3 py-2 text-sm'
const smallBtn =
  'cw-border inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50'
const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,38}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Gitea 사용자·팀 관리 (admin-manager /api/gitea → gitea-mgmt-svc 토큰).
// site admin 과 보호 팀(Owners, ci-*, svc-*) 구성원은 서버가 변경을 거부한다 — 화면에서도 버튼을 숨긴다.
export function GiteaPanel() {
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [secret, setSecret] = useState(null) // { username, temporaryPassword, mustChangePassword, kind }

  const reload = useCallback(async () => {
    try {
      const [u, t] = await Promise.all([AdminApi.getGiteaUsers(), AdminApi.getGiteaTeams()])
      setUsers(u)
      setTeams(t)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const editableTeams = teams.filter((t) => !t.protected)

  async function act(key, fn, success) {
    setBusy(key)
    try {
      const out = await fn()
      if (success) toast.success(success)
      await reload()
      return out
    } catch (err) {
      toast.error(err.message)
      return null
    } finally {
      setBusy(null)
    }
  }

  async function onCreate(input) {
    const out = await act('create', () => AdminApi.createGiteaUser(input))
    if (!out) return false
    setSecret({ ...out, kind: 'create' })
    if (out.failedTeams?.length) toast.error(`팀 추가 실패: ${out.failedTeams.map((f) => f.team).join(', ')}`)
    return true
  }

  function onToggleLogin(u) {
    const next = !u.prohibitLogin
    if (next && !window.confirm(`${u.username} 의 Gitea 로그인을 차단할까요?\n(git push/pull 도 막힙니다. 토큰은 그대로 남습니다)`)) return
    act(`login:${u.username}`, () => AdminApi.setGiteaLogin(u.username, next), `${u.username} 로그인 ${next ? '차단' : '허용'}`)
  }

  async function onReset(u) {
    if (!window.confirm(`${u.username} 의 비밀번호를 임시 비밀번호로 초기화할까요?\n다음 로그인 때 새 비밀번호로 바꾸게 됩니다.`)) return
    const out = await act(`reset:${u.username}`, () => AdminApi.resetGiteaPassword(u.username))
    if (out) setSecret({ ...out, kind: 'reset' })
  }

  function onAddTeam(u, team) {
    if (!team) return
    act(`team:${u.username}`, () => AdminApi.addGiteaTeamMember(team, u.username), `${u.username} → ${team} 추가`)
  }

  function onRemoveTeam(u, team) {
    if (!window.confirm(`${u.username} 을(를) ${team} 팀에서 뺄까요?`)) return
    act(`team:${u.username}`, () => AdminApi.removeGiteaTeamMember(team, u.username), `${u.username} ← ${team} 제거`)
  }

  const columns = [
    {
      key: 'username',
      header: '아이디',
      render: (u) => (
        <span className="inline-flex items-center gap-1.5">
          {u.username}
          {u.protected && (
            <span title={`보호 계정: ${u.protected}`} className="cw-muted">
              <ShieldCheck size={13} />
            </span>
          )}
        </span>
      ),
    },
    { key: 'fullName', header: '이름' },
    { key: 'email', header: '이메일', render: (u) => <span className="cw-muted text-xs">{u.email}</span> },
    {
      key: 'teams',
      header: '팀',
      render: (u) => (
        <div className="flex flex-wrap items-center gap-1">
          {u.teams.map((t) => {
            const removable = !u.protected && editableTeams.some((et) => et.name === t)
            return (
              <span key={t} className="cw-surface-2 cw-border inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[11px]">
                {t}
                {removable && (
                  <button
                    type="button"
                    onClick={() => onRemoveTeam(u, t)}
                    disabled={busy === `team:${u.username}`}
                    className="cw-muted hover:text-[var(--cw-alarm)]"
                    aria-label={`${t} 에서 제거`}
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            )
          })}
          {!u.protected && (
            <select
              value=""
              onChange={(e) => onAddTeam(u, e.target.value)}
              disabled={busy === `team:${u.username}`}
              className="cw-surface cw-border cw-muted rounded border px-1 py-0.5 text-[11px]"
              aria-label="팀 추가"
            >
              <option value="">+ 팀</option>
              {editableTeams
                .filter((t) => !u.teams.includes(t.name))
                .map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
            </select>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (u) =>
        u.prohibitLogin ? (
          <span className="rounded bg-[var(--cw-alarm-bg)] px-2 py-0.5 text-xs font-medium text-[var(--cw-alarm)]">차단됨</span>
        ) : (
          <span className="rounded bg-[var(--cw-ok-bg)] px-2 py-0.5 text-xs font-medium text-[var(--cw-ok)]">사용 중</span>
        ),
    },
    {
      key: 'lastLogin',
      header: '마지막 로그인',
      render: (u) =>
        u.lastLogin ? <span title={new Date(u.lastLogin).toLocaleString()}>{formatAge(u.lastLogin)} 전</span> : <span className="cw-muted text-xs">없음</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (u) =>
        !u.protected && (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onToggleLogin(u)}
              disabled={busy === `login:${u.username}`}
              className={`${smallBtn} ${u.prohibitLogin ? 'cw-text hover:cw-surface-2' : 'text-[var(--cw-alarm)] hover:bg-[var(--cw-alarm-bg)]'}`}
            >
              {u.prohibitLogin ? <LockOpen size={12} /> : <Lock size={12} />} {u.prohibitLogin ? '허용' : '차단'}
            </button>
            <button
              type="button"
              onClick={() => onReset(u)}
              disabled={busy === `reset:${u.username}`}
              className={`${smallBtn} cw-text hover:cw-surface-2`}
            >
              <KeyRound size={12} /> 비밀번호 초기화
            </button>
          </div>
        ),
    },
  ]

  return (
    <div className="space-y-4">
      <CreateGiteaUserForm teams={editableTeams} onCreate={onCreate} creating={busy === 'create'} />
      {secret && <TemporaryPassword secret={secret} onClose={() => setSecret(null)} />}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="cw-text text-sm font-semibold">Gitea 사용자</h2>
          <button
            type="button"
            onClick={() => { setLoading(true); reload() }}
            className="cw-surface cw-border cw-text inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:cw-surface-2"
          >
            <RefreshCw size={13} /> 새로고침
          </button>
        </div>
        <DataTable
          columns={columns}
          rows={users}
          rowKey="id"
          loading={loading}
          emptyTitle="사용자가 없습니다"
          emptyDescription="Gitea 연결 상태를 확인하세요"
        />
        <p className="cw-muted mt-2 text-xs">
          <ShieldCheck size={11} className="inline" /> 표시 계정(site admin, Owners·ci-*·svc-* 팀 구성원)과 보호 팀은 여기서 바꿀 수 없습니다.
          사용자 삭제·팀 권한 변경은 Gitea 화면에서 gitea_admin 으로 합니다.
        </p>
      </div>
    </div>
  )
}

function CreateGiteaUserForm({ teams, onCreate, creating }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [selected, setSelected] = useState([])

  const valid = USERNAME_RE.test(username) && EMAIL_RE.test(email)

  function toggle(name) {
    setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]))
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!valid) return
    const ok = await onCreate({ username, email, fullName, teams: selected })
    if (ok) {
      setUsername('')
      setEmail('')
      setFullName('')
      setSelected([])
    }
  }

  return (
    <form onSubmit={onSubmit} className="cw-surface cw-border space-y-4 rounded-md border p-5">
      <div className="flex items-center gap-2">
        <UserPlus size={16} className="cw-accent-text" />
        <h2 className="cw-text text-sm font-semibold">Gitea 사용자 만들기</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="cw-muted mb-1.5 block text-xs font-medium" htmlFor="gt-username">아이디</label>
          <input id="gt-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="예: dev9" className={inputClass} />
          {username && !USERNAME_RE.test(username) && (
            <p className="mt-1 text-xs text-[var(--cw-alarm)]">영문·숫자로 시작, 영문·숫자·_.- 만, 39자 이하</p>
          )}
        </div>
        <div>
          <label className="cw-muted mb-1.5 block text-xs font-medium" htmlFor="gt-email">이메일</label>
          <input id="gt-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="예: admin+dev9@example.ac.kr" className={inputClass} />
        </div>
        <div>
          <label className="cw-muted mb-1.5 block text-xs font-medium" htmlFor="gt-name">이름 (선택)</label>
          <input id="gt-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <p className="cw-muted mb-1.5 text-xs font-medium">팀 (선택)</p>
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <label key={t.id} className="cw-surface-2 cw-border cw-text inline-flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-xs">
              <input type="checkbox" checked={selected.includes(t.name)} onChange={() => toggle(t.name)} />
              {t.name}
              <span className="cw-muted">({t.permission})</span>
            </label>
          ))}
        </div>
      </div>
      <p className="cw-muted text-xs">임시 비밀번호가 만들어지고, 첫 로그인 때 새 비밀번호로 바꾸게 됩니다.</p>
      <button type="submit" disabled={!valid || creating} className="cw-accent-bg inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        <Plus size={14} /> {creating ? '만드는 중...' : '만들기'}
      </button>
    </form>
  )
}

// 임시 비밀번호는 서버가 저장하지 않는다. 이 창을 닫으면 다시 볼 수 없다 (필요하면 다시 초기화).
function TemporaryPassword({ secret, onClose }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(secret.temporaryPassword)
      toast.success('임시 비밀번호를 복사했습니다')
    } catch {
      toast.error('복사하지 못했습니다')
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-[var(--cw-warning)] bg-[var(--cw-warning-bg)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="cw-text text-sm font-semibold">
            {secret.kind === 'create' ? '사용자 생성 완료' : '비밀번호 초기화 완료'}: {secret.username}
            {secret.teams?.length ? ` (팀: ${secret.teams.join(', ')})` : ''}
          </h2>
          <p className="cw-muted mt-1 text-xs">
            임시 비밀번호를 본인에게만 전달하세요.
            {secret.mustChangePassword && ' 첫 로그인 때 새 비밀번호로 바꾸게 됩니다.'} 이 창을 닫으면 다시 볼 수 없습니다.
          </p>
        </div>
        <button type="button" onClick={onClose} className="cw-muted" aria-label="닫기">
          <X size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code className="cw-surface cw-border cw-text rounded border px-3 py-1.5 font-mono text-sm">{secret.temporaryPassword}</code>
        <button
          type="button"
          onClick={copy}
          className="cw-surface cw-border cw-text inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:cw-surface-2"
        >
          <Copy size={14} /> 복사
        </button>
      </div>
    </div>
  )
}
