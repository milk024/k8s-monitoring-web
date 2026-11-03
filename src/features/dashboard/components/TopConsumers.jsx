import { EmptyState } from '../../../shared/components/EmptyState.jsx'
import { formatCpu, formatMemory } from '../../../shared/utils/formatters.js'

export function TopConsumers({ consumers }) {
  if (!consumers.length) {
    return <EmptyState title="메트릭 데이터가 없습니다" description="metrics-server 연동이 필요합니다." />
  }

  return (
    <ul className="cw-border divide-y">
      {consumers.map((c) => (
        <li key={`${c.namespace}/${c.pod}`} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium cw-text">{c.pod}</p>
            <p className="text-xs cw-muted">{c.namespace}</p>
          </div>
          <div className="flex shrink-0 gap-4 text-xs cw-muted">
            <span>CPU {formatCpu(c.cpuMillicores)}</span>
            <span>MEM {formatMemory(c.memoryBytes)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
