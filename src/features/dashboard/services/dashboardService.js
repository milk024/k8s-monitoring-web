import { ApiService } from '../../../config/ApiService.js'
import { fetchPods } from '../../pods/services/podService.js'
import { fetchDeployments } from '../../deployments/services/deploymentService.js'
import { formatAge } from '../../../shared/utils/formatters.js'

function transformEvent(event) {
  const kind = event.involvedObject?.kind?.toLowerCase() ?? 'object'
  return {
    type: event.type,
    reason: event.reason,
    object: `${kind}/${event.involvedObject?.name ?? '-'}`,
    message: event.message,
    age: formatAge(event.lastTimestamp ?? event.eventTime ?? event.firstTimestamp),
  }
}

function sumPodUsage(podMetric) {
  return podMetric.containers.reduce(
    (acc, c) => ({
      cpuMillicores: acc.cpuMillicores + (c.cpuMillicores ?? 0),
      memoryBytes: acc.memoryBytes + (c.memoryBytes ?? 0),
    }),
    { cpuMillicores: 0, memoryBytes: 0 },
  )
}

function buildTopConsumers(podMetrics) {
  return podMetrics
    .map((pm) => ({ namespace: pm.namespace, pod: pm.pod, ...sumPodUsage(pm) }))
    .sort((a, b) => b.cpuMillicores - a.cpuMillicores)
    .slice(0, 5)
}

function buildSummary(pods, deployments, events) {
  return {
    pods: {
      total: pods.length,
      running: pods.filter((p) => p.status === 'Running').length,
      failing: pods.filter((p) => p.status === 'Failed' || p.status === 'CrashLoopBackOff').length,
    },
    deployments: {
      total: deployments.length,
      healthy: deployments.filter((d) => d.desired > 0 && d.ready === d.desired).length,
    },
    namespaces: {
      total: new Set(pods.map((p) => p.namespace)).size,
    },
    warningEvents: events.filter((e) => e.type === 'Warning').length,
  }
}

export function fetchDashboardData() {
  return Promise.all([
    fetchPods('all'),
    fetchDeployments('all'),
    ApiService.getEvents('all'),
    ApiService.getPodMetrics('all'),
  ]).then(([pods, deployments, rawEvents, podMetrics]) => {
    const events = rawEvents.map(transformEvent)
    return {
      summary: buildSummary(pods, deployments, events),
      events,
      topConsumers: buildTopConsumers(podMetrics),
    }
  })
}
