import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Lock, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import YAML from 'yaml'
import { AdminApi } from '../admin/services/adminApi.js'
import { useAdminAuth } from '../admin/services/adminAuth.js'
import { DataTable } from '../../shared/components/DataTable.jsx'
import { Loader } from '../../shared/components/Loader.jsx'
import { StatusBadge } from '../../shared/components/StatusBadge.jsx'
import { Tabs } from '../../shared/components/Tabs.jsx'
import { CodeEditor } from '../../shared/components/editor/CodeEditor.jsx'
import { formatAge } from '../../shared/utils/formatters.js'

const btn = 'cw-surface cw-border cw-text inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:cw-surface-2 disabled:opacity-50'
const ARGO_TRACKING = 'argocd.argoproj.io/tracking-id'
const LAST_APPLIED = 'kubectl.kubernetes.io/last-applied-configuration'
const DEFAULT_KINDS = ['Deployment', 'Service', 'ConfigMap', 'PersistentVolumeClaim', 'NetworkPolicy', 'HTTPRoute']
const KIND_LABELS = { PersistentVolumeClaim: 'PVC' }

function argoAppOf(obj) {
  const t = obj?.metadata?.annotations?.[ARGO_TRACKING]
  return t ? t.split(':')[0] : null
}

// 새 리소스 틀 (admin-manager 화이트리스트의 apiVersion 과 같아야 한다)
function template(kind, namespace) {
  const meta = { name: 'new-resource', namespace }
  switch (kind) {
    case 'Deployment':
      return { apiVersion: 'apps/v1', kind, metadata: meta, spec: { replicas: 1, selector: { matchLabels: { app: 'new-resource' } }, template: { metadata: { labels: { app: 'new-resource' } }, spec: { containers: [{ name: 'main', image: 'nginx:1.27', ports: [{ containerPort: 80 }] }] } } } }
    case 'Service':
      return { apiVersion: 'v1', kind, metadata: meta, spec: { selector: { app: 'new-resource' }, ports: [{ port: 80, targetPort: 80 }] } }
    case 'ConfigMap':
      return { apiVersion: 'v1', kind, metadata: meta, data: { KEY: 'value' } }
    case 'PersistentVolumeClaim':
      return { apiVersion: 'v1', kind, metadata: meta, spec: { accessModes: ['ReadWriteOnce'], resources: { requests: { storage: '1Gi' } } } }
    case 'NetworkPolicy':
      return { apiVersion: 'networking.k8s.io/v1', kind, metadata: meta, spec: { podSelector: {}, policyTypes: ['Ingress'], ingress: [{ from: [{ podSelector: {} }] }] } }
    case 'HTTPRoute':
      return { apiVersion: 'gateway.networking.k8s.io/v1', kind, metadata: meta, spec: { parentRefs: [{ name: 'infra-gateway', namespace: 'infra', sectionName: 'https' }], rules: [{ matches: [{ path: { type: 'PathPrefix', value: '/new' } }], backendRefs: [{ name: 'new-resource', port: 80 }] }] } }
    default:
      return { apiVersion: 'v1', kind, metadata: meta }
  }
}

function toYaml(obj) {
  const copy = structuredClone(obj)
  // 길고 읽기 어려운 kubectl 기록 주석은 숨긴다 (저장 때 빠져도 patch 라 서버 값은 그대로 남는다)
  if (copy.metadata?.annotations) {
    delete copy.metadata.annotations[LAST_APPLIED]
    if (!Object.keys(copy.metadata.annotations).length) delete copy.metadata.annotations
  }
  return YAML.stringify(copy, { lineWidth: 0 })
}

// ── 편집기 ───────────────────────────────────────────────────────
function YamlEditor({ namespace, kind, name, writable, onSaved, onDeleted, onClose }) {
  const isNew = !name
  const [original, setOriginal] = useState(null) // 서버에서 읽은 객체
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [parseErrorPos, setParseErrorPos] = useState(null) // 편집기 빨간 밑줄용 { line, column, message }
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    if (isNew) {
      setOriginal(null)
      setText(YAML.stringify(template(kind, namespace)))
      return
    }
    setText('')
    try {
      const obj = await AdminApi.getManifest(namespace, kind, name)
      setOriginal(obj)
      setText(toYaml(obj))
    } catch (err) {
      setError(err.message)
    }
  }, [isNew, namespace, kind, name])

  useEffect(() => {
    load()
  }, [load])

  const argoApp = argoAppOf(original)
  const readOnly = Boolean(argoApp) || !writable
  const dirty = !isNew && original && text !== toYaml(original)

  useEffect(() => {
    try {
      YAML.parse(text)
      setParseError(null)
      setParseErrorPos(null)
    } catch (err) {
      const line = err.linePos?.[0]?.line
      setParseErrorPos(line ? { line, column: err.linePos[0].col, message: err.message.split('\n')[0] } : null)
      setParseError(`${line ? `${line}행: ` : ''}${err.message.split('\n')[0]}`)
    }
  }, [text])

  async function save() {
    let obj
    try {
      obj = YAML.parse(text)
    } catch (err) {
      toast.error(`YAML 오류: ${err.message.split('\n')[0]}`)
      return
    }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return toast.error('리소스 하나(객체)만 저장할 수 있습니다')
    if (obj.kind !== kind) return toast.error(`kind 는 ${kind} 여야 합니다 (지금: ${obj.kind})`)
    obj.metadata = obj.metadata ?? {}
    if (obj.metadata.namespace && obj.metadata.namespace !== namespace) return toast.error(`namespace 는 ${namespace} 여야 합니다`)
    obj.metadata.namespace = namespace
    if (!obj.metadata.name) return toast.error('metadata.name 이 필요합니다')
    if (!isNew && obj.metadata.name !== name) return toast.error('이름은 바꿀 수 없습니다 — 새로 만들기를 쓰세요')
    // 동시 수정 감지: 조회 때 resourceVersion 을 그대로 보낸다 (서버가 다르면 거부)
    if (!isNew && original?.metadata?.resourceVersion) obj.metadata.resourceVersion = original.metadata.resourceVersion
    if (isNew) delete obj.metadata.resourceVersion

    const verb = isNew ? '생성' : '수정'
    if (!window.confirm(`${namespace}/${kind}/${obj.metadata.name} 을(를) ${verb}할까요?\n클러스터에 바로 적용됩니다.`)) return
    setBusy(true)
    try {
      const out = await AdminApi.applyManifest(obj)
      toast.success(`${kind} ${obj.metadata.name} ${out?.action === 'create' ? '생성' : '수정'} 완료`)
      onSaved(obj.metadata.name)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    const typed = window.prompt(`${namespace}/${kind}/${name} 을(를) 삭제합니다. 되돌릴 수 없습니다.\n확인하려면 이름(${name})을 입력하세요.`)
    if (typed === null) return
    if (typed !== name) return toast.error('이름이 일치하지 않아 취소했습니다')
    setBusy(true)
    try {
      await AdminApi.deleteManifest({ apiVersion: original.apiVersion, kind, namespace, name })
      toast.success(`${kind} ${name} 삭제 완료`)
      onDeleted()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Ctrl+S (Monaco 단축키)
  function onSave() {
    if (!readOnly && !busy && !parseError) save()
  }

  return (
    <div className="cw-surface cw-border flex min-h-0 flex-col rounded-md border">
      <div className="cw-border flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <span className="cw-text text-sm font-semibold">{isNew ? `새 ${kind}` : name}</span>
        <span className="cw-muted text-xs">{kind}</span>
        {readOnly && (
          <span className="inline-flex items-center gap-1 rounded bg-[var(--cw-info-bg)] px-2 py-0.5 text-xs text-[var(--cw-info)]">
            <Lock size={11} /> {argoApp ? 'ArgoCD 관리' : '조회 전용 네임스페이스'} · 읽기 전용
          </span>
        )}
        {dirty && <span className="text-xs text-[var(--cw-warning)]">● 수정됨</span>}
        <div className="ml-auto flex items-center gap-1.5">
          {!isNew && (
            <button type="button" className={btn} onClick={load} disabled={busy} title="서버에서 다시 읽기 (수정 내용 버림)">
              <RefreshCw size={13} />
            </button>
          )}
          {!readOnly && (
            <button type="button" className={btn} onClick={save} disabled={busy || Boolean(parseError) || (!isNew && !dirty)}>
              <Save size={13} /> {isNew ? '생성' : '저장'}
            </button>
          )}
          {!readOnly && !isNew && (
            <button type="button" className={`${btn} text-[var(--cw-alarm)]`} onClick={remove} disabled={busy || !original}>
              <Trash2 size={13} /> 삭제
            </button>
          )}
          <button type="button" className={btn} onClick={onClose} title="닫기">
            <X size={13} />
          </button>
        </div>
      </div>
      {argoApp && (
        <div className="cw-border border-b bg-[var(--cw-info-bg)] px-3 py-2 text-xs text-[var(--cw-info)]">
          ArgoCD 앱 <Link to={`/deploy-status?app=${encodeURIComponent(argoApp)}`} className="font-semibold underline">{argoApp}</Link> 이(가) 배포 저장소(deploy-*)로 관리합니다.
          여기서 바꿔도 곧 저장소 내용으로 되돌아가므로, 변경은 배포 저장소에서 해 주세요.
        </div>
      )}
      {error ? (
        <div className="p-4 text-sm text-[var(--cw-alarm)]">{error}</div>
      ) : !isNew && !original ? (
        <Loader />
      ) : (
        <CodeEditor value={text} onChange={setText} readOnly={readOnly} language="yaml" onSave={onSave} height="62vh" error={parseErrorPos} />
      )}
      <div className="cw-border flex items-center gap-3 border-t px-3 py-1.5 text-[11px]">
        {parseError ? <span className="text-[var(--cw-alarm)]">YAML 오류: {parseError}</span> : <span className="cw-muted">YAML 정상</span>}
        {!readOnly && <span className="cw-muted ml-auto">Tab = 공백 2칸 · Ctrl+S 저장 · Ctrl+F 검색 · 저장은 patch(빠진 필드는 서버 값 유지)</span>}
      </div>
    </div>
  )
}

// ── 변경 이력 ─────────────────────────────────────────────────────
function History({ namespace, onOpen }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    AdminApi.getManifestHistory(namespace)
      .then(setRows)
      .catch((err) => {
        toast.error(err.message)
        setRows([])
      })
  }, [namespace])
  return (
    <DataTable
      rowKey={(r) => r.id ?? `${r.applied_at}/${r.kind}/${r.name}`}
      rows={rows ?? []}
      loading={rows === null}
      emptyTitle="변경 이력이 없습니다"
      emptyDescription="이 화면(admin-manager)으로 적용·삭제한 기록만 남습니다. ArgoCD 배포는 배포 저장소 커밋 이력을 보세요."
      columns={[
        { key: 'applied_at', header: '시각', render: (r) => <span title={new Date(r.applied_at).toLocaleString()}>{formatAge(r.applied_at)} 전</span> },
        { key: 'action', header: '작업', render: (r) => <StatusBadge status={r.action === 'delete' ? 'Degraded' : r.action === 'create' ? 'Healthy' : 'Progressing'} label={r.action} /> },
        { key: 'kind', header: 'Kind' },
        {
          key: 'name',
          header: '이름',
          render: (r) =>
            r.action === 'delete' ? r.name : (
              <button type="button" className="text-[var(--cw-accent)] hover:underline" onClick={() => onOpen(r.kind, r.name)}>
                {r.name}
              </button>
            ),
        },
        { key: 'applied_by', header: '관리자' },
      ]}
    />
  )
}

// ── 페이지 ───────────────────────────────────────────────────────
export function NamespaceDetailPage() {
  const { namespace } = useParams()
  const navigate = useNavigate()
  const token = useAdminAuth((s) => s.token)
  const [params, setParams] = useSearchParams()
  const [kinds, setKinds] = useState(DEFAULT_KINDS)
  const kind = params.get('kind') ?? 'Deployment'
  const openName = params.get('name') // 편집기에 열린 리소스 (빈 문자열 = 새로 만들기)
  const view = params.get('view') ?? 'resources'
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [editorRev, setEditorRev] = useState(0) // 저장 후 편집기를 서버 값으로 다시 읽게 한다

  // admin-manager 가 권한을 가진 네임스페이스 (deploy-infra apps/admin-manager rbac.namespaces = ISSUABLE_NAMESPACES).
  // 빈 목록이면 제한 없음(로컬 개발). 그 밖의 네임스페이스(infra·kube-system 등)는 일부러 권한을 주지 않았다.
  const [managed, setManaged] = useState(null)

  useEffect(() => {
    if (!token) return
    AdminApi.getManifestKinds().then(setKinds).catch(() => {})
    AdminApi.getNamespaces()
      .then((list) => setManaged(Array.isArray(list) ? list : []))
      .catch(() => setManaged([]))
  }, [token])

  // 수정·삭제 가능 여부. 조회는 모든 네임스페이스에서 된다
  const writable = managed !== null && (managed.length === 0 || managed.includes(namespace))

  const loadList = useCallback(async () => {
    if (!token) return
    setItems(null)
    setError(null)
    try {
      setItems(await AdminApi.listManifests(namespace, kind))
    } catch (err) {
      setError(err.status === 403 ? `admin-manager 에 이 네임스페이스 조회 권한이 없습니다: ${err.message}` : err.message)
      setItems([])
    }
  }, [token, namespace, kind])

  useEffect(() => {
    if (view === 'resources') loadList()
  }, [loadList, view])

  function update(changes) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  const rows = useMemo(
    () =>
      (items ?? []).map((o) => ({
        name: o.metadata.name,
        argoApp: argoAppOf(o),
        created: o.metadata.creationTimestamp,
        summary:
          kind === 'Deployment' ? `${o.status?.readyReplicas ?? 0}/${o.spec?.replicas ?? 0} ready`
            : kind === 'Service' ? `${o.spec?.type ?? ''} ${(o.spec?.ports ?? []).map((p) => p.port).join(',')}`
              : kind === 'ConfigMap' ? `키 ${Object.keys(o.data ?? {}).length}개`
                : kind === 'PersistentVolumeClaim' ? `${o.status?.phase ?? ''} ${o.spec?.resources?.requests?.storage ?? ''}`
                  : kind === 'HTTPRoute' ? (o.spec?.rules ?? []).flatMap((r) => (r.matches ?? []).map((m) => m.path?.value)).filter(Boolean).join(' ')
                    : '',
      })).sort((a, b) => a.name.localeCompare(b.name)),
    [items, kind],
  )

  const editorOpen = openName !== null

  return (
    <div className="space-y-4">
      <div>
        <button type="button" onClick={() => navigate('/namespaces')} className="cw-muted mb-1 inline-flex items-center gap-1 text-xs hover:cw-text">
          <ArrowLeft size={12} /> 네임스페이스 목록
        </button>
        <h1 className="cw-text text-lg font-semibold">{namespace}</h1>
        <p className="cw-muted text-sm">
          네임스페이스 리소스 YAML (admin-manager). 조회는 모든 네임스페이스, 수정은 개발 서비스 네임스페이스만 됩니다. ArgoCD 가 관리하는 리소스는 읽기 전용이고, Secret 은 다루지 않습니다.
        </p>
      </div>

      {!token ? (
        <div className="cw-surface cw-border rounded-md border p-6 text-sm">
          <div className="cw-text font-medium">관리자 로그인이 필요합니다</div>
          <div className="cw-muted mt-1">
            YAML 조회·수정은 관리자만 할 수 있습니다. <Link to="/admin" className="text-[var(--cw-accent)] hover:underline">관리자 화면</Link>에서 로그인한 뒤 돌아오세요.
          </div>
        </div>
      ) : (
        <>
          {managed !== null && !writable && (
            <div className="rounded-md border border-[var(--cw-info)] bg-[var(--cw-info-bg)] px-3 py-2 text-xs text-[var(--cw-info)]">
              <Lock size={11} className="mr-1 inline" />
              조회 전용 네임스페이스입니다. admin-manager 는 {managed.join(', ')} 에서만 수정·삭제할 수 있습니다
              (infra·kube-system 같은 운영 네임스페이스는 관리 도구 자신과 Gitea 등이 있어 일부러 막아 둠). 변경은 배포 저장소(deploy-*)나 helm·kubectl 로 하세요.
            </div>
          )}
          <Tabs
            value={view === 'history' ? '__history' : kind}
            onChange={(k) => (k === '__history' ? update({ view: 'history', name: null }) : update({ view: null, kind: k, name: null }))}
            tabs={[...kinds.map((k) => ({ key: k, label: KIND_LABELS[k] ?? k })), { key: '__history', label: '변경 이력' }]}
          />
          {view === 'history' ? (
            <History namespace={namespace} onOpen={(k, n) => update({ view: null, kind: k, name: n })} />
          ) : (
            <div className={editorOpen ? 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : ''}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="cw-muted text-xs">{items ? `${rows.length}개` : ''}</span>
                  <div className="ml-auto flex gap-1.5">
                    <button type="button" className={btn} onClick={loadList}>
                      <RefreshCw size={13} /> 새로고침
                    </button>
                    {writable && (
                      <button type="button" className={btn} onClick={() => update({ name: '' })}>
                        <Plus size={13} /> 새로 만들기
                      </button>
                    )}
                  </div>
                </div>
                {error && <div className="text-sm text-[var(--cw-alarm)]">{error}</div>}
                <DataTable
                  rowKey="name"
                  rows={rows}
                  loading={items === null}
                  onRowClick={(r) => update({ name: r.name })}
                  emptyTitle={`${KIND_LABELS[kind] ?? kind} 가 없습니다`}
                  emptyDescription="새로 만들기로 추가할 수 있습니다."
                  columns={[
                    {
                      key: 'name',
                      header: '이름',
                      render: (r) => <span className={r.name === openName ? 'font-semibold text-[var(--cw-accent)]' : ''}>{r.name}</span>,
                    },
                    {
                      key: 'argoApp',
                      header: '관리',
                      render: (r) =>
                        r.argoApp ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--cw-info)]"><Lock size={11} /> ArgoCD {r.argoApp}</span>
                        ) : (
                          <span className="cw-muted text-xs">직접 관리</span>
                        ),
                    },
                    { key: 'summary', header: '요약', render: (r) => <span className="cw-muted text-xs">{r.summary}</span> },
                    { key: 'created', header: '기간', render: (r) => formatAge(r.created) },
                  ]}
                />
              </div>
              {editorOpen && (
                <YamlEditor
                  key={`${kind}/${openName}/${editorRev}`}
                  namespace={namespace}
                  kind={kind}
                  name={openName || null}
                  writable={writable}
                  onClose={() => update({ name: null })}
                  onSaved={(n) => {
                    loadList()
                    setEditorRev((r) => r + 1)
                    update({ name: n })
                  }}
                  onDeleted={() => {
                    loadList()
                    update({ name: null })
                  }}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
