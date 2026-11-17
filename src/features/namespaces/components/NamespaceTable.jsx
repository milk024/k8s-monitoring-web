import { useNavigate } from 'react-router-dom'
import { DataTable } from '../../../shared/components/DataTable.jsx'

const columns = [
  { key: 'name', header: '이름' },
  { key: 'podCount', header: '파드 수' },
]

// 행을 누르면 그 네임스페이스의 리소스 YAML 화면으로 간다 (관리자)
export function NamespaceTable({ namespaces, loading }) {
  const navigate = useNavigate()
  return (
    <DataTable
      onRowClick={(n) => navigate(`/namespaces/${encodeURIComponent(n.name)}`)}
      columns={columns}
      rows={namespaces}
      rowKey="name"
      loading={loading}
      emptyTitle="네임스페이스가 없습니다"
      emptyDescription="파드가 존재하는 네임스페이스만 표시됩니다."
    />
  )
}
