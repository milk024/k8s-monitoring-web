import { DataTable } from '../../../shared/components/DataTable.jsx'

const columns = [
  { key: 'name', header: '이름' },
  { key: 'podCount', header: '파드 수' },
]

export function NamespaceTable({ namespaces, loading }) {
  return (
    <DataTable
      columns={columns}
      rows={namespaces}
      rowKey="name"
      loading={loading}
      emptyTitle="네임스페이스가 없습니다"
      emptyDescription="파드가 존재하는 네임스페이스만 표시됩니다."
    />
  )
}
