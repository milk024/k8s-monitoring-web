import { DataTable } from '../../../shared/components/DataTable.jsx'
import { formatCpu, formatMemory } from '../../../shared/utils/formatters.js'

const columns = [
  { key: 'pod', header: '파드' },
  { key: 'namespace', header: '네임스페이스' },
  { key: 'cpuMillicores', header: 'CPU', render: (row) => formatCpu(row.cpuMillicores) },
  { key: 'memoryBytes', header: '메모리', render: (row) => formatMemory(row.memoryBytes) },
]

export function PodUsageTable({ usage, loading }) {
  return (
    <DataTable
      columns={columns}
      rows={usage}
      rowKey="pod"
      loading={loading}
      emptyTitle="사용량 데이터가 없습니다"
      emptyDescription="metrics-server 연동이 필요합니다."
    />
  )
}
