import { ApiService } from '../../../config/ApiService.js'
import { formatAge } from '../../../shared/utils/formatters.js'

export function transformRepo(repo) {
  return {
    name: repo.name,
    owner: repo.owner?.login ?? '-',
    fullName: repo.full_name,
    private: repo.private,
    url: repo.html_url,
    // 기본 브랜치에 Jenkinsfile 이 있는 저장소(서비스). rag 하위 모듈·deploy-* 는 false
    hasCi: repo.hasCi ?? true,
    updatedAge: formatAge(repo.updated_at),
  }
}

export function fetchRepos() {
  return ApiService.getRepos().then((repos) => repos.map(transformRepo))
}

export function registerWebhook(owner, repo, webhookUrl) {
  return ApiService.registerWebhook(owner, repo, webhookUrl)
}

// k8s-manager /builds 응답(또는 'ci:build' 소켓 이벤트) → 표 행
export function transformBuild(b) {
  return {
    id: b.sha,
    sha: b.sha,
    shortSha: b.sha?.slice(0, 7) ?? '-',
    title: b.title,
    branch: b.branch,
    status: b.status,
    buildNumber: b.buildNumber,
    url: b.url,
    updatedAt: b.updatedAt,
    age: b.updatedAt ? formatAge(b.updatedAt) : '-',
  }
}

export function fetchBuilds(owner, repo, limit) {
  return ApiService.getBuilds(owner, repo, limit).then((builds) => builds.map(transformBuild))
}
