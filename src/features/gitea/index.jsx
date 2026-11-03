import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAppState } from '../../core/AppState.ts'
import { fetchRepos, fetchActionRuns, registerWebhook, transformActionRun } from './services/giteaService.js'
import { RepoTable } from './components/RepoTable.jsx'
import { RecentPushes } from './components/RecentPushes.jsx'
import { ActionRunsTable } from './components/ActionRunsTable.jsx'

const DEFAULT_WEBHOOK_URL = 'http://k8s-manager-svc.infra.svc.cluster.local:8000/webhook/gitea'

function mergeRuns(existing, incoming) {
  const byId = new Map(existing.map((r) => [r.id, r]))
  incoming.forEach((r) => byId.set(r.id, r))
  return Array.from(byId.values())
    .sort((a, b) => b.runNumber - a.runNumber)
    .slice(0, 10)
}

export function GiteaPage() {
  const giteaPushes = useAppState((s) => s.giteaPushes)
  const giteaActionsEvents = useAppState((s) => s.giteaActionsEvents)
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK_URL)
  const [registeringName, setRegisteringName] = useState(null)

  const [selectedRepo, setSelectedRepo] = useState(null)
  const [runs, setRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [runsLive, setRunsLive] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchRepos().then((data) => {
      setRepos(data)
      setLoading(false)
      if (data.length > 0) setSelectedRepo(data[0])
    })
  }, [])

  useEffect(() => {
    if (!selectedRepo) return
    setRunsLoading(true)
    setRunsLive(false)
    fetchActionRuns(selectedRepo.owner, selectedRepo.name, 10).then((data) => {
      setRuns(data)
      setRunsLoading(false)
    })
  }, [selectedRepo])

  // 'gitea:actions'는 웹훅이 온 커밋 하나에 대한 job 결과만 담고 있어서, 기존 목록에
  // id 기준으로 병합한다(새로 고침 없이 방금 끝난 빌드가 바로 위에 얹힘).
  useEffect(() => {
    const latest = giteaActionsEvents[0]
    if (!latest || !selectedRepo) return
    if (latest.owner !== selectedRepo.owner || latest.repo !== selectedRepo.name) return
    const incoming = (latest.runs ?? []).map((run) => transformActionRun(run, selectedRepo.name))
    setRuns((prev) => mergeRuns(prev, incoming))
    setRunsLive(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giteaActionsEvents])

  function handleRegisterWebhook(repo) {
    setRegisteringName(repo.name)
    registerWebhook(repo.owner, repo.name, webhookUrl)
      .then(() => toast.success(`${repo.fullName} 웹훅 등록 완료 (이미 등록되어 있으면 그대로 유지됨)`))
      .catch(() => toast.error(`${repo.fullName} 웹훅 등록 실패`))
      .finally(() => setRegisteringName(null))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cw-text text-lg font-semibold">Gitea 연동</h1>
        <p className="cw-muted text-sm">저장소 목록, push 웹훅, CI/CD 빌드 실행 이력을 확인합니다.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="min-w-0 flex-1 cw-surface cw-border cw-text rounded-md border px-3 py-1.5 text-xs focus:border-[var(--cw-accent)] focus:outline-none"
              placeholder="웹훅 대상 URL (k8s_manager /webhook/gitea)"
            />
          </div>
          <RepoTable
            repos={repos}
            loading={loading}
            onRegisterWebhook={handleRegisterWebhook}
            registeringName={registeringName}
          />
        </div>

        <div className="cw-surface cw-border rounded-md border p-4">
          <h2 className="mb-2 cw-text text-sm font-semibold">최근 Push (실시간)</h2>
          <RecentPushes pushes={giteaPushes} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="cw-text text-sm font-semibold">
            빌드 실행 이력
            {runsLive && <span className="ml-2 text-xs font-normal text-[var(--cw-ok)]">● 실시간</span>}
          </h2>
          <select
            value={selectedRepo?.fullName ?? ''}
            onChange={(e) => setSelectedRepo(repos.find((r) => r.fullName === e.target.value) ?? null)}
            className="cw-surface cw-border cw-text rounded-md border px-3 py-1.5 text-xs focus:border-[var(--cw-accent)] focus:outline-none"
          >
            {repos.map((repo) => (
              <option key={repo.fullName} value={repo.fullName}>
                {repo.fullName}
              </option>
            ))}
          </select>
        </div>
        <ActionRunsTable runs={runs} loading={runsLoading} />
      </div>
    </div>
  )
}
