import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ExternalLink, Hammer, Loader2, RefreshCw } from 'lucide-react'
import { useAppState } from '../../core/AppState.ts'
import { DataTable } from '../../shared/components/DataTable.jsx'
import { StatCard } from '../../shared/components/StatCard.jsx'
import { StatusBadge } from '../../shared/components/StatusBadge.jsx'
import { formatAge } from '../../shared/utils/formatters.js'
import { BuildsTable } from '../gitea/components/BuildsTable.jsx'
import { fetchBuilds, transformBuild } from '../gitea/services/giteaService.js'
import { applyBuildEvent, fetchBuildSummaries } from './services/buildSummary.js'

const POLL_MS = 30000
const STATUS_LABELS = { success: '성공', failure: '실패', error: '오류', pending: '빌드 중', none: '빌드 없음' }

function BuildLink({ build }) {
  if (!build?.buildNumber) return <span className="cw-muted">-</span>
  return build.url ? (
    <a href={build.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[var(--cw-accent)] hover:underline">
      #{build.buildNumber} <ExternalLink size={11} />
    </a>
  ) : (
    `#${build.buildNumber}`
  )
}

const columns = [
  { key: 'repo', header: '앱', render: (s) => <span className="font-medium">{s.repo}</span> },
  {
    key: 'status',
    header: '최근 빌드',
    render: (s) =>
      s.error ? (
        <span className="text-xs text-[var(--cw-alarm)]" title={s.error}>조회 실패</span>
      ) : s.latestBuild ? (
        <span className="inline-flex items-center gap-1.5">
          {s.latestBuild.status === 'pending' && <Loader2 size={12} className="animate-spin text-[var(--cw-warning)]" />}
          <StatusBadge status={s.latestBuild.status} label={STATUS_LABELS[s.latestBuild.status]} />
        </span>
      ) : (
        <span className="cw-muted text-xs">빌드 없음</span>
      ),
  },
  { key: 'number', header: '#', render: (s) => <BuildLink build={s.latestBuild} /> },
  {
    key: 'commit',
    header: '커밋',
    render: (s) =>
      s.latestBuild ? (
        <span className="inline-flex items-center gap-2">
          <code className="cw-muted text-xs">{s.latestBuild.sha.slice(0, 7)}</code>
          <span className="max-w-[24rem] truncate" title={s.latestBuild.title}>{s.latestBuild.title}</span>
          {s.head && s.head.sha !== s.latestBuild.sha && (
            <span className="cw-muted text-[11px]" title={`main 최신 ${s.head.sha.slice(0, 7)} ${s.head.title ?? ''}`}>(최신 커밋은 빌드 안 함)</span>
          )}
        </span>
      ) : (
        '-'
      ),
  },
  {
    key: 'updated',
    header: '갱신',
    render: (s) => (s.latestBuild?.updatedAt ? <span title={new Date(s.latestBuild.updatedAt).toLocaleString()}>{formatAge(s.latestBuild.updatedAt)} 전</span> : '-'),
  },
  {
    key: 'lastSuccess',
    header: '최근 성공',
    render: (s) =>
      s.lastSuccess ? (
        s.lastSuccess.sha === s.latestBuild?.sha ? (
          <span className="cw-muted text-xs">= 최근 빌드</span>
        ) : (
          <span className="cw-muted text-xs">
            <code>{s.lastSuccess.sha.slice(0, 7)}</code> #{s.lastSuccess.buildNumber ?? '-'} · {formatAge(s.lastSuccess.updatedAt)} 전
          </span>
        )
      ) : (
        <span className="cw-muted text-xs">-</span>
      ),
  },
]

// 펼친 행: 그 앱의 main 빌드 이력 (최근 10 커밋)
function RepoHistory({ owner, repo }) {
  const ciBuildEvents = useAppState((s) => s.ciBuildEvents)
  const [builds, setBuilds] = useState(null)

  useEffect(() => {
    let alive = true
    fetchBuilds(owner, repo, 10).then((b) => alive && setBuilds(b))
    return () => {
      alive = false
    }
  }, [owner, repo])

  useEffect(() => {
    const ev = ciBuildEvents[0]
    if (!ev || ev.owner !== owner || ev.repo !== repo || (ev.branch && ev.branch !== 'main')) return
    const row = transformBuild(ev)
    setBuilds((prev) => {
      if (!prev) return prev
      const i = prev.findIndex((b) => b.id === row.id)
      if (i >= 0) return prev.map((b, idx) => (idx === i ? { ...b, ...row } : b))
      return [row, ...prev].slice(0, 10)
    })
  }, [ciBuildEvents, owner, repo])

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <BuildsTable builds={builds ?? []} loading={builds === null} />
    </div>
  )
}

// Jenkins 빌드 상태 — 빌드하는 앱(Jenkinsfile 있는 저장소) 전체를 한 표로
export function BuildsPage() {
  const autoRefresh = useAppState((s) => s.autoRefresh)
  const ciBuildEvents = useAppState((s) => s.ciBuildEvents)
  const [summaries, setSummaries] = useState(null)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [params, setParams] = useSearchParams()
  const openRepo = params.get('repo')

  const load = useCallback(async () => {
    try {
      setSummaries(await fetchBuildSummaries())
      setError(null)
      setUpdatedAt(new Date())
    } catch (err) {
      setError(err.message)
      setSummaries((prev) => prev ?? [])
    }
  }, [])

  useEffect(() => {
    load()
    if (!autoRefresh) return undefined
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [load, autoRefresh])

  // 실시간: 빌드 시작·종료 즉시 반영
  useEffect(() => {
    const ev = ciBuildEvents[0]
    if (!ev) return
    setSummaries((prev) => (prev ? applyBuildEvent(prev, ev) : prev))
  }, [ciBuildEvents])

  const rows = summaries ?? []
  const stats = useMemo(
    () => ({
      building: rows.filter((s) => s.latestBuild?.status === 'pending').length,
      failed: rows.filter((s) => ['failure', 'error'].includes(s.latestBuild?.status)).length,
    }),
    [rows],
  )

  function toggle(s) {
    const next = new URLSearchParams(params)
    if (openRepo === s.repo) next.delete('repo')
    else next.set('repo', s.repo)
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="cw-text text-lg font-semibold">빌드 상태 (Jenkins)</h1>
          <p className="cw-muted text-sm">
            main 에 push 되면 Jenkins 가 이미지를 빌드합니다. 빌드 시작·종료는 실시간으로 반영되고, 행을 누르면 최근 빌드 이력이 펼쳐집니다.
            빌드 뒤 배포 반영 여부는 <Link to="/deploy-status" className="text-[var(--cw-accent)] hover:underline">배포 상태</Link>에서 봅니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && <span className="cw-muted text-xs">{updatedAt.toLocaleTimeString()} 갱신</span>}
          <button
            type="button"
            onClick={load}
            className="cw-surface cw-border cw-text inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:cw-surface-2"
          >
            <RefreshCw size={14} /> 새로고침
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={Hammer} label="빌드 대상 앱" value={rows.length} sublabel="Jenkinsfile 있는 저장소" tone="info" />
        <StatCard icon={stats.building ? Loader2 : CheckCircle2} label="빌드 중" value={stats.building} sublabel="Jenkins 진행 중" tone={stats.building ? 'warning' : 'success'} />
        <StatCard icon={stats.failed ? AlertTriangle : CheckCircle2} label="최근 빌드 실패" value={stats.failed} sublabel="최근 빌드가 실패한 앱" tone={stats.failed ? 'danger' : 'success'} />
      </div>

      {error && (
        <div className="rounded-md border border-[var(--cw-alarm)] bg-[var(--cw-alarm-bg)] px-3 py-2 text-sm text-[var(--cw-alarm)]">
          빌드 상태를 가져오지 못했습니다: {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey="repo"
        loading={summaries === null}
        onRowClick={toggle}
        renderExpanded={(s) => (s.repo === openRepo ? <RepoHistory owner={s.owner} repo={s.repo} /> : null)}
        emptyTitle="빌드 대상 앱이 없습니다"
        emptyDescription="Jenkinsfile 이 있는 저장소가 없습니다."
      />
    </div>
  )
}
