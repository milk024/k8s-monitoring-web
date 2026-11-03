export const StatusTone = {
  Running: 'success',
  Succeeded: 'info',
  Pending: 'warning',
  ContainerCreating: 'warning',
  Progressing: 'warning',
  Terminating: 'warning',
  Failed: 'danger',
  CrashLoopBackOff: 'danger',
  Unknown: 'neutral',
  // Gitea Actions 실행 상태 (소문자 — k8s 리소스 상태와 구분됨)
  success: 'success',
  failure: 'danger',
  running: 'warning',
  waiting: 'neutral',
}

export function toneForStatus(status) {
  return StatusTone[status] ?? 'neutral'
}
