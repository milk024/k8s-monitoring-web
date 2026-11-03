export function isHealthyDeployment(deployment) {
  return deployment.desired > 0 && deployment.ready === deployment.desired
}

export function formatAge(timestamp) {
  if (!timestamp) return '-'
  const diffMs = Date.now() - new Date(timestamp).getTime()
  if (diffMs < 0) return '0s'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function formatCpu(millicores) {
  if (!millicores) return '0m'
  return `${Math.round(millicores)}m`
}

export function formatMemory(bytes) {
  if (!bytes) return '0Mi'
  const mebibytes = bytes / (1024 * 1024)
  if (mebibytes < 1024) return `${Math.round(mebibytes)}Mi`
  return `${(mebibytes / 1024).toFixed(1)}Gi`
}
