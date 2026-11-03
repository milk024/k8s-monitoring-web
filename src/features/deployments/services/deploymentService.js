import { ApiService } from '../../../config/ApiService.js'
import { formatAge } from '../../../shared/utils/formatters.js'

export function transformDeployment(deployment) {
  return {
    name: deployment.metadata.name,
    namespace: deployment.metadata.namespace,
    desired: deployment.spec?.replicas ?? 0,
    ready: deployment.status?.readyReplicas ?? 0,
    upToDate: deployment.status?.updatedReplicas ?? 0,
    available: deployment.status?.availableReplicas ?? 0,
    age: formatAge(deployment.metadata.creationTimestamp),
  }
}

export function fetchDeployments(namespace) {
  return ApiService.getDeployments(namespace).then((deployments) => deployments.map(transformDeployment))
}
