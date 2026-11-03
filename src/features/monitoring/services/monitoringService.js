import { ApiService } from '../../../config/ApiService.js'

function sumContainerUsage(containers) {
  return (containers ?? []).reduce(
    (acc, c) => ({
      cpuMillicores: acc.cpuMillicores + (c.cpuMillicores ?? 0),
      memoryBytes: acc.memoryBytes + (c.memoryBytes ?? 0),
    }),
    { cpuMillicores: 0, memoryBytes: 0 },
  )
}

export function transformPodUsage(podMetric) {
  return {
    namespace: podMetric.namespace,
    pod: podMetric.pod,
    ...sumContainerUsage(podMetric.containers),
  }
}

export function fetchPodUsage(namespace) {
  return ApiService.getPodMetrics(namespace).then((list) => list.map(transformPodUsage))
}

export function transformGpuMetric(item) {
  return {
    host: item.metric?.Hostname ?? item.metric?.instance ?? '-',
    gpu: item.metric?.gpu ?? '-',
    model: item.metric?.modelName ?? '-',
    uuid: item.metric?.UUID ?? '-',
    utilization: Number(item.value?.[1] ?? 0),
    // dcgm-exporter는 자기 자신의 namespace/pod(gpu-operator)를 metric.namespace/pod에 채워서
    // 워크로드 필터링에 못 쓴다 — 실제로 그 GPU를 쓰는 워크로드는 exported_* 라벨에 있다.
    podNamespace: item.metric?.exported_namespace ?? null,
    podName: item.metric?.exported_pod ?? null,
  }
}

export function fetchGpuUtilization(namespace) {
  return ApiService.getGpuUtilization(namespace).then((list) => list.map(transformGpuMetric))
}
