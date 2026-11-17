import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '../../../shared/components/DataTable.jsx'
import { formatAge } from '../../../shared/utils/formatters.js'
import { AdminApi } from '../services/adminApi.js'

const PAGE = 50

const ACTION_LABELS = {
  'auth.login': '로그인',
  'account.issue': '계정 발급',
  'account.revoke': '계정 회수',
  'manifest.apply': 'YAML 적용',
  'manifest.delete': 'YAML 삭제',
  'admin.create': '관리자 추가',
  'gitea.user.create': 'Gitea 사용자 생성',
  'gitea.user.disable': 'Gitea 로그인 차단',
  'gitea.user.enable': 'Gitea 로그인 허용',
  'gitea.user.reset_password': 'Gitea 비밀번호 초기화',
  'gitea.team.add_member': 'Gitea 팀 추가',
  'gitea.team.remove_member': 'Gitea 팀 제거',
}

const ACTION_FILTERS = [
  { value: '', label: '전체 작업' },
  { value: 'account.*', label: '계정 발급/회수' },
  { value: 'auth.login', label: '로그인' },
  { value: 'gitea.*', label: 'Gitea 관리' },
  { value: 'manifest.*', label: 'YAML 적용/삭제' },
  { value: 'admin.create', label: '관리자 추가' },
]

const selectClass = 'cw-surface cw-border cw-text rounded-md border px-2 py-1 text-xs'

function detailText(row) {
  const d = row.detail || {}
  const parts = []
  if (d.rbacTemplate) parts.push(`권한 ${d.rbacTemplate}`)
  if (d.teams?.length) parts.push(`팀 ${d.teams.join(', ')}`)
  if (d.mustChange === false) parts.push('변경 강제 안 함')
  if (d.reason === 'locked') parts.push('시도 제한으로 잠김')
  if (d.reason === 'bad_credentials') parts.push('아이디/비밀번호 불일치')
  if (d.error) parts.push(d.error)
  if (d.migrated) parts.push('이전 기록에서 이관')
  return parts.join(' · ')
}

// 관리 작업 이력 (admin-manager /api/audit). 최신순, 50개씩 더 불러오기.
export function AuditLogPanel() {
  const [action, setAction] = useState('')
  const [result, setResult] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)

  const load = useCallback(async (before) => {
    try {
      const page = await AdminApi.getAuditLog({ action, result, before, limit: PAGE })
      setRows((prev) => (before ? [...prev, ...page] : page))
      setMore(page.length === PAGE)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [action, result])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const columns = [
    {
      key: 'at',
      header: '시각',
      render: (row) => <span title={new Date(row.at).toLocaleString()}>{formatAge(row.at)} 전</span>,
    },
    { key: 'actor', header: '관리자' },
    { key: 'action', header: '작업', render: (row) => ACTION_LABELS[row.action] ?? row.action },
    { key: 'target', header: '대상', render: (row) => row.target ?? '' },
    {
      key: 'result',
      header: '결과',
      render: (row) =>
        row.result === 'success' ? (
          <span className="rounded bg-[var(--cw-ok-bg)] px-2 py-0.5 text-xs font-medium text-[var(--cw-ok)]">성공</span>
        ) : (
          <span className="rounded bg-[var(--cw-alarm-bg)] px-2 py-0.5 text-xs font-medium text-[var(--cw-alarm)]">실패</span>
        ),
    },
    { key: 'ip', header: 'IP', render: (row) => <span className="cw-muted text-xs">{row.ip ?? ''}</span> },
    { key: 'detail', header: '내용', render: (row) => <span className="cw-muted text-xs">{detailText(row)}</span> },
  ]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectClass} value={action} onChange={(e) => setAction(e.target.value)} aria-label="작업 종류">
          {ACTION_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select className={selectClass} value={result} onChange={(e) => setResult(e.target.value)} aria-label="결과">
          <option value="">성공+실패</option>
          <option value="success">성공만</option>
          <option value="failure">실패만</option>
        </select>
        <button
          type="button"
          onClick={() => { setLoading(true); load() }}
          className="cw-surface cw-border cw-text inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:cw-surface-2"
        >
          <RefreshCw size={13} /> 새로고침
        </button>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        emptyTitle="기록이 없습니다"
        emptyDescription="계정 발급·회수, 로그인 같은 관리 작업이 여기에 남습니다"
      />
      {more && !loading && (
        <button
          type="button"
          onClick={() => load(rows[rows.length - 1].id)}
          className="cw-surface cw-border cw-text w-full rounded-md border py-1.5 text-xs font-medium hover:cw-surface-2"
        >
          더 보기
        </button>
      )}
    </div>
  )
}
