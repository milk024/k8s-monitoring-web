import { useNavigate } from 'react-router-dom'
import { DataTable } from '../../../shared/components/DataTable.jsx'
import { StatusBadge } from '../../../shared/components/StatusBadge.jsx'

const columns = [
  { key: 'name', header: '이름' },
  { key: 'namespace', header: '네임스페이스' },
  { key: 'ready', header: 'Ready' },
  { key: 'status', header: '상태', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'restarts', header: '재시작' },
  { key: 'node', header: '노드' },
  { key: 'age', header: '기간' },
]

// 행을 누르면 Pod 상세(개요·연관 리소스·로그·이벤트)로 간다
export function PodTable({ pods, loading }) {
  const navigate = useNavigate()
  return (
    <DataTable
      columns={columns}
      rows={pods}
      rowKey={(p) => `${p.namespace}/${p.name}`}
      onRowClick={(p) => navigate(`/pods/${encodeURIComponent(p.namespace)}/${encodeURIComponent(p.name)}`)}
      loading={loading}
      emptyTitle="파드가 없습니다"
      emptyDescription="선택한 네임스페이스에 실행 중인 파드가 없습니다."
    />
  )
}
