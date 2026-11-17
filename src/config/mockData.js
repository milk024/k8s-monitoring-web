function agoIso(ms) {
  return new Date(Date.now() - ms).toISOString()
}

const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function pod(name, namespace, nodeName, phase, containerStatuses, ageMs) {
  return {
    metadata: { name, namespace, creationTimestamp: agoIso(ageMs) },
    spec: { nodeName, containers: containerStatuses.map((c) => ({ name: c.name })) },
    status: { phase, containerStatuses },
  }
}

export const mockPods = [
  pod('api-gateway-7d9f8c6b8-2x4kq', 'production', 'node-worker-1', 'Running', [
    { name: 'api', ready: true, restartCount: 0 },
    { name: 'envoy-sidecar', ready: true, restartCount: 0 },
  ], 12 * DAY),
  pod('api-gateway-7d9f8c6b8-9m2lp', 'production', 'node-worker-2', 'Running', [
    { name: 'api', ready: true, restartCount: 0 },
    { name: 'envoy-sidecar', ready: true, restartCount: 0 },
  ], 12 * DAY),
  pod('payments-worker-6c8b7d9f-x8k2', 'production', 'node-worker-1', 'Running', [
    { name: 'worker', ready: true, restartCount: 2 },
  ], 5 * DAY),
  pod('payments-worker-6c8b7d9f-p9j1', 'production', 'node-worker-2', 'Running', [
    {
      name: 'worker',
      ready: false,
      restartCount: 14,
      state: { waiting: { reason: 'CrashLoopBackOff', message: 'back-off restarting failed container' } },
    },
  ], 2 * HOUR),
  pod('frontend-5f7d6c9b8-abc12', 'default', 'node-worker-1', 'Running', [
    { name: 'web', ready: true, restartCount: 0 },
  ], 20 * DAY),
  pod('frontend-5f7d6c9b8-def34', 'default', 'node-worker-2', 'Running', [
    { name: 'web', ready: true, restartCount: 0 },
  ], 20 * DAY),
  pod('redis-0', 'default', 'node-worker-1', 'Running', [
    { name: 'redis', ready: true, restartCount: 0 },
  ], 33 * DAY),
  pod('batch-job-migrate-8x2kd', 'default', 'node-worker-1', 'Succeeded', [
    { name: 'migrate', ready: false, restartCount: 0 },
  ], 3 * HOUR),
  pod('coredns-5d78c9869d-9f2kq', 'kube-system', 'node-worker-2', 'Running', [
    { name: 'coredns', ready: true, restartCount: 0 },
  ], 58 * DAY),
  pod('grafana-7c9d8f6b8-m2p1q', 'monitoring', 'node-worker-1', 'Running', [
    { name: 'grafana', ready: true, restartCount: 0 },
  ], 19 * DAY),
  pod('prometheus-0', 'monitoring', 'node-worker-2', 'Running', [
    { name: 'prometheus', ready: true, restartCount: 0 },
    { name: 'config-reloader', ready: true, restartCount: 0 },
  ], 19 * DAY),
  pod('loki-0', 'monitoring', 'node-worker-1', 'Pending', [], 5 * MIN),
]

function deployment(name, namespace, desired, ready, updated, available, ageMs) {
  return {
    metadata: { name, namespace, creationTimestamp: agoIso(ageMs) },
    spec: { replicas: desired },
    status: { replicas: desired, readyReplicas: ready, updatedReplicas: updated, availableReplicas: available },
  }
}

export const mockDeployments = [
  deployment('api-gateway', 'production', 2, 2, 2, 2, 12 * DAY),
  deployment('payments-worker', 'production', 2, 1, 2, 1, 5 * DAY),
  deployment('frontend', 'default', 2, 2, 2, 2, 20 * DAY),
  deployment('grafana', 'monitoring', 1, 1, 1, 1, 19 * DAY),
  deployment('loki', 'monitoring', 1, 0, 1, 0, 5 * MIN),
  deployment('coredns', 'kube-system', 2, 2, 2, 2, 58 * DAY),
]

function event(type, reason, kind, name, namespace, message, ageMs) {
  return {
    type,
    reason,
    involvedObject: { kind, name },
    metadata: { namespace },
    message,
    lastTimestamp: agoIso(ageMs),
  }
}

export const mockEvents = [
  event('Warning', 'BackOff', 'Pod', 'payments-worker-6c8b7d9f-p9j1', 'production', 'Back-off restarting failed container', 2 * MIN),
  event('Normal', 'Pulled', 'Pod', 'loki-0', 'monitoring', 'Container image already present on machine', 5 * MIN),
  event('Normal', 'Scheduled', 'Pod', 'loki-0', 'monitoring', 'Successfully assigned monitoring/loki-0 to node-worker-1', 5 * MIN),
  event('Normal', 'ScalingReplicaSet', 'Deployment', 'api-gateway', 'production', 'Scaled up replica set api-gateway-7d9f8c6b8 to 2', 12 * DAY),
  event('Warning', 'FailedMount', 'Pod', 'payments-worker-6c8b7d9f-p9j1', 'production', 'Unable to attach or mount volumes', 18 * MIN),
]

export const mockPodMetrics = [
  { namespace: 'production', pod: 'api-gateway-7d9f8c6b8-2x4kq', containers: [{ name: 'api', cpuMillicores: 120, memoryBytes: 256 * 1024 * 1024 }, { name: 'envoy-sidecar', cpuMillicores: 40, memoryBytes: 64 * 1024 * 1024 }] },
  { namespace: 'production', pod: 'payments-worker-6c8b7d9f-x8k2', containers: [{ name: 'worker', cpuMillicores: 340, memoryBytes: 512 * 1024 * 1024 }] },
  { namespace: 'default', pod: 'frontend-5f7d6c9b8-abc12', containers: [{ name: 'web', cpuMillicores: 60, memoryBytes: 128 * 1024 * 1024 }] },
  { namespace: 'default', pod: 'redis-0', containers: [{ name: 'redis', cpuMillicores: 80, memoryBytes: 300 * 1024 * 1024 }] },
  { namespace: 'monitoring', pod: 'prometheus-0', containers: [{ name: 'prometheus', cpuMillicores: 450, memoryBytes: 1024 * 1024 * 1024 }] },
]

function gpuMetric(hostname, gpuIndex, uuid, modelName, utilPercent, exportedNamespace, exportedPod) {
  return {
    metric: {
      Hostname: hostname,
      gpu: String(gpuIndex),
      UUID: uuid,
      modelName,
      exported_namespace: exportedNamespace,
      exported_pod: exportedPod,
    },
    value: [Math.floor(Date.now() / 1000), String(utilPercent)],
  }
}

export const mockGpuUtilization = [
  gpuMetric('super', 0, 'GPU-3a1f9c2e', 'NVIDIA A100-SXM4-80GB', 62, 'llm-serving', 'gemma-4-12b-it-kserve-6b444687c5-mv959'),
  gpuMetric('super', 1, 'GPU-7b2e8d41', 'NVIDIA A100-SXM4-80GB', 18, null, null),
]

export const mockRepos = [
  {
    id: 1,
    name: 'k8s-manager',
    full_name: 'myorg/k8s-manager',
    owner: { login: 'myorg' },
    private: true,
    html_url: 'http://gitea.infra.svc.cluster.local:3000/myorg/k8s-manager',
    description: 'Namespace: infra 통합 관리 서버',
    updated_at: agoIso(3 * HOUR),
  },
  {
    id: 2,
    name: 'monitoring-web',
    full_name: 'myorg/monitoring-web',
    owner: { login: 'myorg' },
    private: true,
    html_url: 'http://gitea.infra.svc.cluster.local:3000/myorg/monitoring-web',
    description: 'K8s 클러스터 모니터링 대시보드',
    updated_at: agoIso(30 * MIN),
  },
]

function build(n, sha, title, status, ageMs) {
  return {
    id: sha,
    owner: 'myorg',
    repo: 'monitoring-web',
    branch: 'main',
    sha,
    title,
    status,
    buildNumber: status === 'none' ? null : n,
    description: status === 'none' ? null : `Jenkins #${n} ${status === 'success' ? 'SUCCESS' : 'FAILURE'}`,
    url: status === 'none' ? null : `https://gpu.example.ac.kr/jenkins/job/infra/job/monitoring-web/job/main/${n}/`,
    updatedAt: agoIso(ageMs),
  }
}

export const mockBuilds = [
  build(5, 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678', 'fix: dashboard 서브패스 nginx 리다이렉트', 'success', 30 * MIN),
  build(4, 'f0e9d8c7b6a5948372615049382716059483726', 'feat: GPU 모니터링 화면 추가', 'success', 2 * HOUR),
  build(3, '1234567890abcdef1234567890abcdef12345678', 'docs: README 정리 [skip ci]', 'none', 3 * HOUR),
  build(3, 'abcdef1234567890abcdef1234567890abcdef12', 'feat: Gitea 연동 화면 추가', 'failure', 12 * HOUR),
  build(2, '0987654321fedcba0987654321fedcba09876543', 'Initial commit', 'success', 1 * DAY),
]
