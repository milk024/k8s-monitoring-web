import { ApiService } from '../../../config/ApiService.js'
import { formatAge } from '../../../shared/utils/formatters.js'

function derivePodStatus(pod) {
  const phase = pod.status?.phase ?? 'Unknown'
  const crashing = pod.status?.containerStatuses?.find((cs) => cs.state?.waiting?.reason)
  if (phase === 'Running' && crashing) return crashing.state.waiting.reason
  return phase
}

export function transformPod(pod) {
  const containerStatuses = pod.status?.containerStatuses ?? []
  const total = containerStatuses.length || pod.spec?.containers?.length || 0
  const readyCount = containerStatuses.filter((cs) => cs.ready).length
  const restarts = containerStatuses.reduce((sum, cs) => sum + (cs.restartCount ?? 0), 0)

  return {
    name: pod.metadata.name,
    namespace: pod.metadata.namespace,
    status: derivePodStatus(pod),
    ready: `${readyCount}/${total}`,
    restarts,
    node: pod.spec?.nodeName ?? '-',
    age: formatAge(pod.metadata.creationTimestamp),
  }
}

export function fetchPods(namespace) {
  return ApiService.getPods(namespace).then((pods) => pods.map(transformPod))
}
