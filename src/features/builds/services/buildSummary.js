import { ApiService } from '../../../config/ApiService.js'

// k8s-manager GET /api/gitea/builds : 저장소별 { repo, head, latestBuild, lastSuccess }
export function fetchBuildSummaries() {
  return ApiService.getBuildSummaries()
}

// 'ci:build' 소켓 이벤트(빌드 1건)를 요약 목록에 반영한다 (main 만)
export function applyBuildEvent(summaries, ev) {
  if (!ev || (ev.branch && ev.branch !== 'main')) return summaries
  return summaries.map((s) => {
    if (s.owner !== ev.owner || s.repo !== ev.repo) return s
    const next = { ...s }
    // 같은 커밋이면 상태만 갱신, 새 커밋이면 최근 빌드·최신 커밋으로
    if (!s.latestBuild || s.latestBuild.sha === ev.sha || s.head?.sha === ev.sha || ev.status === 'pending') {
      next.latestBuild = { ...(s.latestBuild?.sha === ev.sha ? s.latestBuild : {}), ...ev }
    }
    if (!s.head || s.head.sha === ev.sha || ev.status === 'pending') next.head = { ...(s.head?.sha === ev.sha ? s.head : {}), ...ev }
    if (ev.status === 'success') next.lastSuccess = { ...ev }
    return next
  })
}

// 배포된 이미지 태그(커밋)와 빌드 결과를 비교한 상태
//   { key, label, tone, detail }  key: building | failed | current | waiting | unknown
export function deployVsBuild(summary, deployedSha) {
  if (!summary || !deployedSha) return null
  const latest = summary.latestBuild
  const ok = summary.lastSuccess
  const n = (b) => (b?.buildNumber ? ` #${b.buildNumber}` : '')
  if (latest && latest.sha !== deployedSha && latest.status === 'pending') {
    return { key: 'building', label: `빌드 중${n(latest)}`, status: 'pending', detail: `${latest.sha.slice(0, 7)} ${latest.title ?? ''}` }
  }
  if (latest && latest.sha !== deployedSha && ['failure', 'error'].includes(latest.status)) {
    return { key: 'failed', label: `빌드 실패${n(latest)}`, status: 'failure', detail: `이전 버전(${deployedSha.slice(0, 7)})이 계속 배포돼 있음` }
  }
  if (ok && ok.sha === deployedSha) {
    return { key: 'current', label: '최신 반영', status: 'success', detail: `빌드${n(ok)} = 배포 이미지` }
  }
  if (ok && ok.sha !== deployedSha) {
    return { key: 'waiting', label: `배포 대기${n(ok)}`, status: 'pending', detail: `빌드 ${ok.sha.slice(0, 7)} 성공 → 배포 저장소 반영·동기화 대기 (지금 ${deployedSha.slice(0, 7)})` }
  }
  return { key: 'unknown', label: '빌드 기록 없음', status: 'none', detail: '최근 커밋에 Jenkins 빌드 상태가 없습니다' }
}

// 이미지 gpu.example.ac.kr/myorg/rag-server:<sha> → { repo: 'rag-server', sha }
export function parseImage(image) {
  const last = image.split('/').pop() ?? ''
  const [repo, tag] = last.split(':')
  return { repo, sha: tag ?? null }
}
