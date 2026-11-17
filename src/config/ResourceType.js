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
  // Jenkins 빌드 상태 = Gitea 커밋 상태 jenkins/build (소문자 — k8s 리소스 상태와 구분됨)
  success: 'success',
  failure: 'danger',
  error: 'danger',
  pending: 'warning',
  none: 'neutral',
  // ArgoCD sync / health
  Synced: 'success',
  OutOfSync: 'warning',
  Healthy: 'success',
  Degraded: 'danger',
  Missing: 'danger',
  Suspended: 'neutral',
  Error: 'danger',
  // 컨테이너 상태 / 이벤트 종류
  Terminated: 'neutral',
  Waiting: 'warning',
  ImagePullBackOff: 'danger',
  ErrImagePull: 'danger',
  OOMKilled: 'danger',
  Warning: 'warning',
  Normal: 'neutral',
}

export function toneForStatus(status) {
  return StatusTone[status] ?? 'neutral'
}
