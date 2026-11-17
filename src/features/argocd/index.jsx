import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ExternalLink, GitBranch, RefreshCw, Rocket } from 'lucide-react'
import { useAppState } from '../../core/AppState.ts'
import { ApiService } from '../../config/ApiService.js'
import { DataTable } from '../../shared/components/DataTable.jsx'
import { StatCard } from '../../shared/components/StatCard.jsx'
import { StatusBadge } from '../../shared/components/StatusBadge.jsx'
import { formatAge } from '../../shared/utils/formatters.js'
import { applyBuildEvent, deployVsBuild, fetchBuildSummaries, parseImage } from '../builds/services/buildSummary.js'

const POLL_MS = 15000
const ARGOCD_UI = 'https://gpu.example.ac.kr/argocd/applications/argocd'

// 이미지 gpu.example.ac.kr/myorg/rag-server:7c54e36f... → rag-server:7c54e36
function shortImage(image) {
  const last = image.split('/').pop() ?? image
  const [name, tag] = last.split(':')
  return tag ? `${name}:${tag.slice(0, 7)}` : name
}

// https://gpu.example.ac.kr/gitea/myorg/deploy-rag.git → deploy-rag
function repoName(url) {
  return (url ?? '').replace(/\.git$/, '').split('/').pop() || '-'
}

function needsAttention(app) {
  return (
    app.syncStatus !== 'Synced' ||
    app.healthStatus !== 'Healthy' ||
    ['Failed', 'Error'].includes(app.operation?.phase) ||
    ['building', 'failed', 'waiting'].includes(app.build?.key)
  )
}

const columns = [
  {
    key: 'name',
    header: '앱',
    render: (a) => (
      <span className="inline-flex items-center gap-2">
        <span className="font-medium">{a.name}</span>
        <span className="cw-muted text-xs">{a.project}</span>
      </span>
    ),
  },
  { key: 'syncStatus', header: 'Sync', render: (a) => <StatusBadge status={a.syncStatus} /> },
  { key: 'healthStatus', header: 'Health', render: (a) => <StatusBadge status={a.healthStatus} /> },
  {
    key: 'images',
    header: '이미지',
    render: (a) =>
      a.images.length ? (
        <span className="inline-flex flex-col">
          {a.images.map((img) => (
            <code key={img} className="text-xs" title={img}>
              {shortImage(img)}
            </code>
          ))}
        </span>
      ) : (
        <span className="cw-muted">-</span>
      ),
  },
  {
    key: 'build',
    header: '빌드 대비',
    render: (a) =>
      a.build ? (
        <Link
          to={`/builds?repo=${encodeURIComponent(a.buildRepo)}`}
          onClick={(e) => e.stopPropagation()}
          title={a.build.detail}
          className="inline-flex items-center"
        >
          <StatusBadge status={a.build.status} label={a.build.label} />
        </Link>
      ) : (
        <span className="cw-muted text-xs">-</span>
      ),
  },
  {
    key: 'repo',
    header: '배포 저장소',
    render: (a) => (
      <span className="cw-muted inline-flex items-center gap-1 text-xs" title={`${a.repoURL} (${a.targetRevision})`}>
        <GitBranch size={12} />
        {repoName(a.repoURL)}/{a.path ?? ''} @ <code>{a.revision?.slice(0, 7) ?? '-'}</code>
      </span>
    ),
  },
  {
    key: 'lastSync',
    header: '최근 동기화',
    render: (a) =>
      a.operation ? (
        <span className="inline-flex items-center gap-2" title={a.operation.finishedAt ? new Date(a.operation.finishedAt).toLocaleString() : ''}>
          <StatusBadge status={a.operation.phase === 'Succeeded' ? 'Synced' : a.operation.phase === 'Running' ? 'Progressing' : 'Degraded'} label={a.operation.phase} />
          <span className="cw-muted text-xs">{a.operation.finishedAt ? `${formatAge(a.operation.finishedAt)} 전` : '진행 중'}</span>
        </span>
      ) : (
        <span className="cw-muted">-</span>
      ),
  },
  {
    key: 'policy',
    header: '자동 동기화',
    render: (a) => <span className="cw-muted text-xs">{a.autoSync ? `자동${a.selfHeal ? ' · selfHeal' : ''}` : '수동'}</span>,
  },
]

const resourceColumns = [
  { key: 'kind', header: 'Kind' },
  { key: 'name', header: '이름' },
  { key: 'namespace', header: '네임스페이스', render: (r) => r.namespace ?? <span className="cw-muted">(클러스터)</span> },
  { key: 'syncStatus', header: 'Sync', render: (r) => (r.syncStatus ? <StatusBadge status={r.syncStatus} /> : '-') },
  {
    key: 'healthStatus',
    header: 'Health',
    render: (r) =>
      r.healthStatus ? (
        <span className="inline-flex items-center gap-2">
          <StatusBadge status={r.healthStatus} />
          {r.healthMessage && <span className="cw-muted max-w-[24rem] truncate text-xs" title={r.healthMessage}>{r.healthMessage}</span>}
        </span>
      ) : (
        <span className="cw-muted">-</span>
      ),
  },
]

function AppDetail({ app }) {
  const problems = app.resources.filter((r) => (r.syncStatus && r.syncStatus !== 'Synced') || (r.healthStatus && r.healthStatus !== 'Healthy'))
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        <span className="cw-muted">대상 네임스페이스 <span className="cw-text">{app.destinationNamespace ?? '-'}</span></span>
        <span className="cw-muted">추적 브랜치 <span className="cw-text">{app.targetRevision}</span></span>
        <span className="cw-muted">
          마지막 확인 <span className="cw-text">{app.reconciledAt ? `${formatAge(app.reconciledAt)} 전` : '-'}</span>
        </span>
        <span className="cw-muted">
          마지막 배포 <span className="cw-text">{app.lastDeployedAt ? new Date(app.lastDeployedAt).toLocaleString() : '-'}</span>
        </span>
        <a href={`${ARGOCD_UI}/${encodeURIComponent(app.name)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--cw-accent)] hover:underline">
          ArgoCD 에서 열기 <ExternalLink size={11} />
        </a>
        {app.destinationNamespace && (
          <Link to={`/namespaces/${encodeURIComponent(app.destinationNamespace)}`} className="text-[var(--cw-accent)] hover:underline">
            네임스페이스 리소스 보기
          </Link>
        )}
      </div>
      {(app.healthMessage || app.operation?.message || app.conditions.length > 0) && (
        <div className="cw-border space-y-1 rounded-md border p-2 text-xs">
          {app.healthMessage && <div><span className="cw-muted">Health: </span>{app.healthMessage}</div>}
          {app.operation?.message && <div className="whitespace-pre-wrap break-all"><span className="cw-muted">동기화 결과: </span>{app.operation.message}</div>}
          {app.conditions.map((c) => (
            <div key={c.type} className="text-[var(--cw-warning)]">
              {c.type}: {c.message}
            </div>
          ))}
        </div>
      )}
      <div className="cw-muted text-xs">
        관리 리소스 {app.resources.length}개{problems.length ? ` · 문제 ${problems.length}개 (위로 정렬)` : ' · 모두 정상'}
      </div>
      <DataTable
        columns={resourceColumns}
        rows={[...problems, ...app.resources.filter((r) => !problems.includes(r))]}
        rowKey={(r) => `${r.kind}/${r.namespace}/${r.name}`}
        maxHeight="max-h-[40vh]"
        emptyTitle="관리 리소스가 없습니다"
      />
    </div>
  )
}

// ArgoCD 배포 상태 (읽기 전용). Sync·Rollback 같은 조작은 ArgoCD UI 에서 한다.
export function ArgoCdPage() {
  const autoRefresh = useAppState((s) => s.autoRefresh)
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [params, setParams] = useSearchParams()
  const openApp = params.get('app')

  // 빌드 요약 (배포된 이미지 태그와 비교해 "최신 반영 / 배포 대기 / 빌드 중 / 빌드 실패")
  const [summaries, setSummaries] = useState([])
  const ciBuildEvents = useAppState((s) => s.ciBuildEvents)

  const load = useCallback(async () => {
    // 빌드 요약은 실패해도 배포 상태는 보여준다
    fetchBuildSummaries().then(setSummaries).catch(() => {})
    try {
      setApps(await ApiService.getArgoApps())
      setError(null)
      setUpdatedAt(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ev = ciBuildEvents[0]
    if (ev) setSummaries((prev) => applyBuildEvent(prev, ev))
  }, [ciBuildEvents])

  useEffect(() => {
    load()
    if (!autoRefresh) return undefined
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [load, autoRefresh])

  const stats = useMemo(
    () => ({
      total: apps.length,
      outOfSync: apps.filter((a) => a.syncStatus !== 'Synced').length,
      unhealthy: apps.filter((a) => a.healthStatus !== 'Healthy').length,
    }),
    [apps],
  )
  const rows = useMemo(() => {
    const byRepo = new Map(summaries.map((s) => [s.repo, s]))
    return apps.map((a) => {
      // 앱 이미지 중 빌드 대상 저장소와 이름이 같은 것 (이미지 이름 = Gitea 저장소 이름)
      const img = a.images.map(parseImage).find((i) => byRepo.has(i.repo))
      return img ? { ...a, buildRepo: img.repo, build: deployVsBuild(byRepo.get(img.repo), img.sha) } : a
    })
  }, [apps, summaries])
  const sorted = useMemo(() => [...rows].sort((a, b) => Number(needsAttention(b)) - Number(needsAttention(a))), [rows])

  function toggle(app) {
    const next = new URLSearchParams(params)
    if (openApp === app.name) next.delete('app')
    else next.set('app', app.name)
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="cw-text text-lg font-semibold">배포 상태 (ArgoCD)</h1>
          <p className="cw-muted text-sm">
            deploy-* 저장소 → 클러스터 동기화 상태입니다. '빌드 대비'는 배포된 이미지가 최근 성공 빌드와 같은지 보여줍니다(누르면 빌드 화면). 읽기 전용이며, 동기화·롤백은 ArgoCD 화면에서 합니다. 행을 누르면 관리 리소스가 펼쳐집니다.
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
        <StatCard icon={Rocket} label="앱" value={stats.total} sublabel="ArgoCD Application" tone="info" />
        <StatCard
          icon={stats.outOfSync ? AlertTriangle : CheckCircle2}
          label="OutOfSync"
          value={stats.outOfSync}
          sublabel="저장소와 클러스터가 다름"
          tone={stats.outOfSync ? 'warning' : 'success'}
        />
        <StatCard
          icon={stats.unhealthy ? AlertTriangle : CheckCircle2}
          label="비정상"
          value={stats.unhealthy}
          sublabel="Health 가 Healthy 아님"
          tone={stats.unhealthy ? 'danger' : 'success'}
        />
      </div>

      {error && (
        <div className="rounded-md border border-[var(--cw-alarm)] bg-[var(--cw-alarm-bg)] px-3 py-2 text-sm text-[var(--cw-alarm)]">
          ArgoCD 상태를 가져오지 못했습니다: {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={sorted}
        rowKey="name"
        loading={loading}
        onRowClick={toggle}
        renderExpanded={(a) => (a.name === openApp ? <AppDetail app={a} /> : null)}
        emptyTitle="ArgoCD 앱이 없습니다"
        emptyDescription="argocd 네임스페이스에 Application 이 없습니다."
      />
    </div>
  )
}
