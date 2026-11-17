import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAppState } from '../../core/AppState.ts'
import { Link } from 'react-router-dom'
import { fetchRepos, registerWebhook } from './services/giteaService.js'
import { RepoTable } from './components/RepoTable.jsx'
import { RecentPushes } from './components/RecentPushes.jsx'

const DEFAULT_WEBHOOK_URL = 'http://k8s-manager-svc.infra.svc.cluster.local:8000/webhook/gitea'

export function GiteaPage() {
  const giteaPushes = useAppState((s) => s.giteaPushes)
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK_URL)
  const [registeringName, setRegisteringName] = useState(null)
  // 기본은 CI(Jenkins) 저장소만. rag 하위 모듈·deploy-* 는 빌드·웹훅 대상이 아니라 숨긴다
  const [showAllRepos, setShowAllRepos] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchRepos().then((data) => {
      setRepos(data)
      setLoading(false)
    })
  }, [])

  const ciRepos = repos.filter((r) => r.hasCi)
  const visibleRepos = showAllRepos ? repos : ciRepos

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
        <p className="cw-muted text-sm">
          저장소 목록과 웹훅(push·빌드 상태), 최근 push 를 확인합니다. Jenkins 빌드 결과는{' '}
          <Link to="/builds" className="text-[var(--cw-accent)] hover:underline">빌드</Link> 화면에서 봅니다.
        </p>
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
            <label className="cw-muted inline-flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={showAllRepos} onChange={(e) => setShowAllRepos(e.target.checked)} />
              모듈·배포 저장소도 보기 ({repos.length - ciRepos.length})
            </label>
          </div>
          <RepoTable
            repos={visibleRepos}
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
    </div>
  )
}
