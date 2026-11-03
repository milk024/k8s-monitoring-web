import { fetchPods } from '../../pods/services/podService.js'

export function fetchNamespaces() {
  return fetchPods('all').then((pods) => {
    const counts = new Map()
    for (const pod of pods) {
      counts.set(pod.namespace, (counts.get(pod.namespace) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, podCount]) => ({ name, podCount }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })
}
