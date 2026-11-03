import { DataTable } from '../../../shared/components/DataTable.jsx'
import { StatusBadge } from '../../../shared/components/StatusBadge.jsx'
import { isHealthyDeployment } from '../../../shared/utils/formatters.js'

const columns = [
  { key: 'name', header: '이름' },
  { key: 'namespace', header: '네임스페이스' },
  { key: 'ready', header: 'Ready', render: (row) => `${row.ready}/${row.desired}` },
  { key: 'upToDate', header: 'Up-to-date' },
  { key: 'available', header: 'Available' },
  {
    key: 'status',
    header: '상태',
    render: (row) => <StatusBadge status={isHealthyDeployment(row) ? 'Running' : 'Progressing'} />,
  },
  { key: 'age', header: '기간' },
]

export function DeploymentTable({ deployments, loading }) {
  return (
    <DataTable
      columns={columns}
      rows={deployments}
      rowKey="name"
      loading={loading}
      emptyTitle="디플로이먼트가 없습니다"
    />
  )
}
