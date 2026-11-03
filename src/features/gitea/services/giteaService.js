import { ApiService } from '../../../config/ApiService.js'
import { formatAge } from '../../../shared/utils/formatters.js'

export function transformRepo(repo) {
  return {
    name: repo.name,
    owner: repo.owner?.login ?? '-',
    fullName: repo.full_name,
    private: repo.private,
    url: repo.html_url,
    updatedAge: formatAge(repo.updated_at),
  }
}

export function fetchRepos() {
  return ApiService.getRepos().then((repos) => repos.map(transformRepo))
}

export function registerWebhook(owner, repo, webhookUrl) {
  return ApiService.registerWebhook(owner, repo, webhookUrl)
}

export function transformActionRun(run, repo) {
  const shortSha = run.head_sha?.slice(0, 7) ?? '-'
  return {
    id: run.id,
    runNumber: run.run_number,
    branch: run.head_branch,
    title: run.display_title,
    status: run.status,
    workflow: run.workflow_id,
    shortSha,
    imageTag: `registry.example.com/org/${repo}:${run.head_sha}`,
    age: formatAge(run.updated_at ?? run.run_started_at ?? run.created_at),
  }
}

export function fetchActionRuns(owner, repo, limit) {
  return ApiService.getActionRuns(owner, repo, limit).then((runs) => runs.map((run) => transformActionRun(run, repo)))
}
