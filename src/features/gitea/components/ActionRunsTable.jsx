import { DataTable } from '../../../shared/components/DataTable.jsx'
import { StatusBadge } from '../../../shared/components/StatusBadge.jsx'

const columns = [
  { key: 'runNumber', header: '#', render: (row) => `#${row.runNumber}` },
  { key: 'title', header: '커밋' },
  { key: 'branch', header: '브랜치' },
  { key: 'status', header: '상태', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'workflow', header: '워크플로우' },
  { key: 'age', header: '갱신' },
]

export function ActionRunsTable({ runs, loading }) {
  return (
    <DataTable
      columns={columns}
      rows={runs}
      rowKey="id"
      loading={loading}
      emptyTitle="실행 이력이 없습니다"
      emptyDescription="이 저장소에 push되면 Gitea Actions 실행 이력이 여기 표시됩니다."
    />
  )
}
