import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { useAppState } from '../../core/AppState.ts'
import { ApiService } from '../../config/ApiService.js'
import { DataTable } from '../../shared/components/DataTable.jsx'
import { Loader } from '../../shared/components/Loader.jsx'
import { StatusBadge } from '../../shared/components/StatusBadge.jsx'
import { Tabs } from '../../shared/components/Tabs.jsx'
import { formatAge } from '../../shared/utils/formatters.js'
import { transformPod } from './services/podService.js'

const inputClass = 'cw-surface-2 cw-border cw-text rounded-md border px-2 py-1 text-xs'
const btn = 'cw-surface cw-border cw-text inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:cw-surface-2 disabled:opacity-50'
const linkClass = 'text-[var(--cw-accent)] hover:underline'

// 에러 줄 판별: 흔한 로그 형식(평문 ERROR, level=error, JSON "level":"error", Python Traceback, Go panic, klog E0101)
const ERROR_RE = /\b(error|exception|fatal|panic|traceback|critical|failed|failure|oomkilled)\b|level=(error|fatal)|"level"\s*:\s*"(error|fatal|critical)"|^E\d{4} /i
// YAML 관리 화면(admin-manager 화이트리스트)으로 연결할 수 있는 Kind
const YAML_KINDS = new Set(['Deployment', 'Service', 'ConfigMap', 'PersistentVolumeClaim', 'NetworkPolicy', 'HTTPRoute'])

function yamlLink(namespace, kind, name) {
  return `/namespaces/${encodeURIComponent(namespace)}?kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(name)}`
}

function containerState(cs) {
  if (!cs?.state) return { label: 'Unknown', detail: null }
  if (cs.state.running) return { label: 'Running', detail: `시작 ${formatAge(cs.state.running.startedAt)} 전` }
  if (cs.state.waiting) return { label: cs.state.waiting.reason ?? 'Waiting', detail: cs.state.waiting.message ?? null }
  const t = cs.state.terminated
  return { label: t.reason ?? 'Terminated', detail: `exit ${t.exitCode}${t.message ? ` · ${t.message}` : ''}` }
}

// ── 개요 ─────────────────────────────────────────────────────────
function Overview({ pod }) {
  const statuses = new Map([...(pod.status?.initContainerStatuses ?? []), ...(pod.status?.containerStatuses ?? [])].map((cs) => [cs.name, cs]))
  const containers = [
    ...(pod.spec?.initContainers ?? []).map((c) => ({ ...c, init: true })),
    ...(pod.spec?.containers ?? []),
  ].map((c) => {
    const cs = statuses.get(c.name)
    const state = containerState(cs)
    const last = cs?.lastState?.terminated
    return {
      name: c.name,
      init: c.init,
      image: c.image,
      ready: cs?.ready,
      restarts: cs?.restartCount ?? 0,
      state,
      last: last ? `${last.reason ?? 'Terminated'} (exit ${last.exitCode}) · ${formatAge(last.finishedAt)} 전` : null,
      resources: c.resources,
    }
  })

  const info = [
    ['노드', pod.spec?.nodeName ?? '-'],
    ['Pod IP', pod.status?.podIP ?? '-'],
    ['QoS', pod.status?.qosClass ?? '-'],
    ['생성', pod.metadata?.creationTimestamp ? `${new Date(pod.metadata.creationTimestamp).toLocaleString()} (${formatAge(pod.metadata.creationTimestamp)} 전)` : '-'],
    ['ServiceAccount', pod.spec?.serviceAccountName ?? '-'],
    ['재시작 정책', pod.spec?.restartPolicy ?? '-'],
  ]
  const badConditions = (pod.status?.conditions ?? []).filter((c) => c.status !== 'True')

  return (
    <div className="space-y-4">
      <div className="cw-surface cw-border grid grid-cols-1 gap-x-6 gap-y-2 rounded-md border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {info.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <div className="cw-muted text-xs">{k}</div>
            <div className="cw-text truncate" title={String(v)}>{v}</div>
          </div>
        ))}
      </div>
      {badConditions.length > 0 && (
        <div className="rounded-md border border-[var(--cw-warning)] bg-[var(--cw-warning-bg)] px-3 py-2 text-xs text-[var(--cw-warning)]">
          {badConditions.map((c) => (
            <div key={c.type}>
              {c.type}=False{c.reason ? ` · ${c.reason}` : ''}{c.message ? ` · ${c.message}` : ''}
            </div>
          ))}
        </div>
      )}
      <DataTable
        rowKey="name"
        rows={containers}
        columns={[
          { key: 'name', header: '컨테이너', render: (c) => <span>{c.name}{c.init && <span className="cw-muted ml-1 text-xs">(init)</span>}</span> },
          { key: 'image', header: '이미지', render: (c) => <code className="text-xs" title={c.image}>{c.image.split('/').pop()}</code> },
          { key: 'state', header: '상태', render: (c) => (
            <span className="inline-flex items-center gap-2">
              <StatusBadge status={c.state.label} />
              {c.state.detail && <span className="cw-muted max-w-[20rem] truncate text-xs" title={c.state.detail}>{c.state.detail}</span>}
            </span>
          ) },
          { key: 'ready', header: 'Ready', render: (c) => (c.ready ? '✓' : '-') },
          { key: 'restarts', header: '재시작', render: (c) => <span className={c.restarts ? 'text-[var(--cw-warning)]' : ''}>{c.restarts}</span> },
          { key: 'last', header: '직전 종료', render: (c) => (c.last ? <span className="text-xs text-[var(--cw-alarm)]">{c.last}</span> : <span className="cw-muted">-</span>) },
          { key: 'resources', header: '요청 / 제한', render: (c) => (
            <span className="cw-muted text-xs">
              {c.resources?.requests ? Object.entries(c.resources.requests).map(([k, v]) => `${k} ${v}`).join(', ') : '-'}
              {' / '}
              {c.resources?.limits ? Object.entries(c.resources.limits).map(([k, v]) => `${k} ${v}`).join(', ') : '-'}
            </span>
          ) },
        ]}
      />
    </div>
  )
}

// ── 연관 리소스 ───────────────────────────────────────────────────
function RelatedRow({ label, children }) {
  return (
    <div className="cw-border grid grid-cols-[9rem_1fr] gap-3 border-b px-4 py-2.5 last:border-b-0">
      <div className="cw-muted text-xs font-semibold">{label}</div>
      <div className="cw-text flex flex-wrap items-center gap-2 text-sm">{children}</div>
    </div>
  )
}

function ResourceChip({ namespace, kind, name, note }) {
  const linkable = YAML_KINDS.has(kind)
  const inner = (
    <>
      <span className="cw-muted text-[10px] uppercase">{kind}</span> {name}
      {note && <span className="cw-muted text-xs"> {note}</span>}
    </>
  )
  return linkable ? (
    <Link to={yamlLink(namespace, kind, name)} className="cw-border rounded border px-2 py-0.5 text-[var(--cw-accent)] hover:underline" title="YAML 보기 (관리자)">
      {inner}
    </Link>
  ) : (
    <span className="cw-border rounded border px-2 py-0.5">{inner}</span>
  )
}

function Related({ namespace, name }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setData(null)
    setError(null)
    ApiService.getPodRelated(namespace, name)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message))
    return () => {
      alive = false
    }
  }, [namespace, name])

  if (error) return <div className="text-sm text-[var(--cw-alarm)]">연관 리소스를 가져오지 못했습니다: {error}</div>
  if (!data) return <Loader />
  const none = <span className="cw-muted">없음</span>

  return (
    <div className="space-y-3">
      <div className="cw-surface cw-border rounded-md border">
        <RelatedRow label="만든 컨트롤러">
          {data.owners.length ? data.owners.map((o) => <ResourceChip key={`${o.kind}/${o.name}`} namespace={namespace} {...o} />) : none}
        </RelatedRow>
        <RelatedRow label="ArgoCD 앱">
          {data.argoApp ? (
            <>
              <Link to={`/deploy-status?app=${encodeURIComponent(data.argoApp)}`} className={linkClass}>{data.argoApp}</Link>
              <span className="cw-muted text-xs">— 배포 저장소(deploy-*)가 원본이라 YAML 화면에서는 읽기 전용입니다</span>
            </>
          ) : (
            <span className="cw-muted">ArgoCD 관리 아님</span>
          )}
        </RelatedRow>
        <RelatedRow label="Service">
          {data.services.length
            ? data.services.map((s) => <ResourceChip key={s.name} namespace={namespace} kind="Service" name={s.name} note={`${s.type} ${s.ports.join(', ')}`} />)
            : none}
        </RelatedRow>
        <RelatedRow label="HTTPRoute">
          {data.httpRoutes.length
            ? data.httpRoutes.map((r) => (
              <ResourceChip
                key={r.name}
                namespace={namespace}
                kind="HTTPRoute"
                name={r.name}
                note={[r.hostnames.join(','), r.paths.join(' ')].filter(Boolean).join(' ') || null}
              />
            ))
            : none}
        </RelatedRow>
        <RelatedRow label="ConfigMap">
          {data.configMaps.length ? data.configMaps.map((n) => <ResourceChip key={n} namespace={namespace} kind="ConfigMap" name={n} />) : none}
        </RelatedRow>
        <RelatedRow label="Secret (이름만)">
          {data.secrets.length ? data.secrets.map((n) => <ResourceChip key={n} namespace={namespace} kind="Secret" name={n} />) : none}
        </RelatedRow>
        <RelatedRow label="PVC">
          {data.persistentVolumeClaims.length
            ? data.persistentVolumeClaims.map((n) => <ResourceChip key={n} namespace={namespace} kind="PersistentVolumeClaim" name={n} />)
            : none}
        </RelatedRow>
        <RelatedRow label="ServiceAccount">{data.serviceAccount ?? none}</RelatedRow>
      </div>
      <p className="cw-muted text-xs">
        파란 항목을 누르면 네임스페이스 YAML 화면에서 엽니다 (관리자 로그인 필요). Secret 은 값을 다루지 않으므로 이름만 보입니다.
      </p>
      {data.warnings.length > 0 && <p className="text-xs text-[var(--cw-warning)]">일부 조회 실패: {data.warnings.join(' / ')}</p>}
    </div>
  )
}

// ── 로그 ─────────────────────────────────────────────────────────
function Logs({ namespace, name, pod }) {
  const containerNames = useMemo(
    () => [...(pod.spec?.containers ?? []).map((c) => c.name), ...(pod.spec?.initContainers ?? []).map((c) => c.name)],
    [pod],
  )
  const restarted = useMemo(
    () => new Set((pod.status?.containerStatuses ?? []).filter((cs) => cs.restartCount > 0 || cs.lastState?.terminated).map((cs) => cs.name)),
    [pod],
  )
  const [container, setContainer] = useState(containerNames[0] ?? '')
  const [previous, setPrevious] = useState(false)
  const [tailLines, setTailLines] = useState(500)
  const [errorsOnly, setErrorsOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [text, setText] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setText(await ApiService.getPodLog(namespace, name, { container, previous, tailLines }))
    } catch (err) {
      setText(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [namespace, name, container, previous, tailLines])

  useEffect(() => {
    load()
  }, [load])

  // 에러 줄 + 바로 뒤에 이어지는 들여쓴 줄(스택 트레이스)을 함께 남긴다
  const lines = useMemo(() => {
    const all = (text ?? '').split('\n')
    if (all.at(-1) === '') all.pop()
    const marked = all.map((line, i) => ({ n: i + 1, line, isError: ERROR_RE.test(line) }))
    let out = marked
    if (errorsOnly) {
      out = []
      let inBlock = false
      for (const m of marked) {
        if (m.isError) inBlock = true
        else if (!/^\s+\S|^\s*(at |File "|Caused by|\.\.\. \d+ more)/.test(m.line)) inBlock = false
        if (inBlock) out.push(m)
      }
    }
    if (search) {
      const q = search.toLowerCase()
      out = out.filter((m) => m.line.toLowerCase().includes(q))
    }
    return { shown: out, total: marked.length, errors: marked.filter((m) => m.isError).length }
  }, [text, errorsOnly, search])

  function download() {
    const blob = new Blob([text ?? ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}_${container}${previous ? '_previous' : ''}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {containerNames.length > 1 && (
          <select className={inputClass} value={container} onChange={(e) => setContainer(e.target.value)}>
            {containerNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <label className="cw-text inline-flex items-center gap-1 text-xs" title="직전에 종료된(크래시한) 컨테이너의 로그">
          <input type="checkbox" checked={previous} onChange={(e) => setPrevious(e.target.checked)} />
          이전 컨테이너{restarted.has(container) && <span className="text-[var(--cw-warning)]"> (재시작 있음)</span>}
        </label>
        <select className={inputClass} value={tailLines} onChange={(e) => setTailLines(Number(e.target.value))}>
          {[200, 500, 2000, 5000].map((n) => <option key={n} value={n}>최근 {n}줄</option>)}
        </select>
        <label className="cw-text inline-flex items-center gap-1 text-xs">
          <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} />
          에러만 <span className={lines.errors ? 'text-[var(--cw-alarm)]' : 'cw-muted'}>({lines.errors})</span>
        </label>
        <input className={`${inputClass} w-48`} placeholder="검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" className={btn} onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> 새로고침
        </button>
        <button type="button" className={btn} onClick={download} disabled={!text}>
          <Download size={13} /> 받기
        </button>
        <span className="cw-muted ml-auto text-xs">{lines.shown.length} / {lines.total}줄</span>
      </div>
      {error ? (
        <div className="text-sm text-[var(--cw-alarm)]">
          {previous && /previous terminated container/i.test(error) ? '이전에 종료된 컨테이너가 없습니다 (재시작한 적 없음).' : `로그를 가져오지 못했습니다: ${error}`}
        </div>
      ) : text === null ? (
        <Loader />
      ) : (
        <pre className="cw-border max-h-[65vh] overflow-auto rounded-md border bg-[#0b1220] p-3 font-mono text-[11.5px] leading-5 text-[#d6dde6]">
          {lines.shown.length === 0 ? (
            <span className="text-[#8b99a7]">{lines.total ? '조건에 맞는 줄이 없습니다' : '로그가 비어 있습니다'}</span>
          ) : (
            lines.shown.map((m) => (
              <div key={m.n} className={m.isError ? 'bg-[rgba(255,106,105,0.14)] text-[#ffb4b3]' : ''}>
                <span className="mr-3 inline-block w-10 select-none text-right text-[#5f6b7a]">{m.n}</span>
                {m.line}
              </div>
            ))
          )}
        </pre>
      )}
    </div>
  )
}

// ── 이벤트 ───────────────────────────────────────────────────────
function Events({ namespace, name, onWarnings }) {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ApiService.getPodEvents(namespace, name)
      .then((items) => {
        if (!alive) return
        const rows = items
          .map((e) => ({
            id: e.metadata.uid,
            type: e.type,
            reason: e.reason,
            message: e.message,
            count: e.count ?? e.series?.count ?? 1,
            last: e.lastTimestamp ?? e.eventTime ?? e.metadata.creationTimestamp,
          }))
          .sort((a, b) => new Date(b.last) - new Date(a.last))
        setEvents(rows)
        onWarnings?.(rows.filter((r) => r.type === 'Warning').length)
      })
      .catch((err) => alive && setError(err.message))
    return () => {
      alive = false
    }
  }, [namespace, name, onWarnings])

  if (error) return <div className="text-sm text-[var(--cw-alarm)]">이벤트를 가져오지 못했습니다: {error}</div>
  return (
    <DataTable
      rowKey="id"
      rows={events ?? []}
      loading={events === null}
      emptyTitle="이벤트가 없습니다"
      emptyDescription="K8s 이벤트는 약 1시간만 보관됩니다."
      columns={[
        { key: 'type', header: '종류', render: (e) => <StatusBadge status={e.type} /> },
        { key: 'reason', header: '사유' },
        { key: 'message', header: '내용', render: (e) => <span className="block max-w-[40rem] whitespace-normal break-all text-xs">{e.message}</span> },
        { key: 'count', header: '횟수' },
        { key: 'last', header: '마지막', render: (e) => <span title={new Date(e.last).toLocaleString()}>{formatAge(e.last)} 전</span> },
      ]}
    />
  )
}

// ── 페이지 ───────────────────────────────────────────────────────
export function PodDetailPage() {
  const { namespace, name } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'overview'
  const k8sPodsLive = useAppState((s) => s.k8sPodsLive)
  const [fetched, setFetched] = useState(undefined) // undefined: 로딩, null: 없음
  const [warningCount, setWarningCount] = useState(0)

  const livePod = k8sPodsLive?.find((p) => p.metadata.namespace === namespace && p.metadata.name === name)

  useEffect(() => {
    if (livePod) return
    let alive = true
    ApiService.getPodsStrict(namespace)
      .then((pods) => alive && setFetched(pods.find((p) => p.metadata.name === name) ?? null))
      .catch(() => alive && setFetched(null))
    return () => {
      alive = false
    }
  }, [namespace, name, livePod])

  const pod = livePod ?? fetched
  const summary = pod ? transformPod(pod) : null

  function setTab(key) {
    const next = new URLSearchParams(params)
    next.set('tab', key)
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <button type="button" onClick={() => navigate(-1)} className="cw-muted mb-1 inline-flex items-center gap-1 text-xs hover:cw-text">
            <ArrowLeft size={12} /> 뒤로
          </button>
          <h1 className="cw-text flex flex-wrap items-center gap-2 text-lg font-semibold">
            <span className="truncate">{name}</span>
            {summary && <StatusBadge status={summary.status} />}
            {k8sPodsLive && livePod && <span className="text-xs font-normal text-[var(--cw-ok)]">● 실시간</span>}
          </h1>
          <p className="cw-muted text-sm">
            <Link to={`/namespaces/${encodeURIComponent(namespace)}`} className={linkClass}>{namespace}</Link>
            {summary && ` · Ready ${summary.ready} · 재시작 ${summary.restarts} · ${summary.age}`}
          </p>
        </div>
      </div>

      {pod === undefined ? (
        <Loader />
      ) : pod === null ? (
        <div className="cw-surface cw-border rounded-md border p-6 text-sm">
          <div className="cw-text font-medium">Pod 를 찾을 수 없습니다</div>
          <div className="cw-muted mt-1">이미 삭제됐거나 새 Pod 로 교체됐을 수 있습니다. <Link to="/pods" className={linkClass}>파드 목록</Link> 에서 다시 고르세요.</div>
        </div>
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'overview', label: '개요' },
              { key: 'related', label: '연관 리소스' },
              { key: 'logs', label: '로그' },
              { key: 'events', label: '이벤트', badge: warningCount || null },
            ]}
          />
          {tab === 'overview' && <Overview pod={pod} />}
          {tab === 'related' && <Related namespace={namespace} name={name} />}
          {tab === 'logs' && <Logs namespace={namespace} name={name} pod={pod} />}
          <div className={tab === 'events' ? '' : 'hidden'}>
            <Events namespace={namespace} name={name} onWarnings={setWarningCount} />
          </div>
        </>
      )}
    </div>
  )
}
