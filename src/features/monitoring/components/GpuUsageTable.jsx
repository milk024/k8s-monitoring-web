import { DataTable } from '../../../shared/components/DataTable.jsx'

const columns = [
  { key: 'host', header: '노드' },
  { key: 'gpu', header: 'GPU #' },
  { key: 'model', header: '모델' },
  { key: 'utilization', header: '사용률', render: (row) => `${Math.round(row.utilization)}%` },
  {
    key: 'pod',
    header: '할당된 Pod',
    render: (row) =>
      row.podName ? (
        <span>
          {row.podNamespace}/{row.podName}
        </span>
      ) : (
        <span className="cw-muted">미할당</span>
      ),
  },
]

export function GpuUsageTable({ gpus, loading }) {
  return (
    <DataTable
      columns={columns}
      rows={gpus}
      rowKey="uuid"
      loading={loading}
      emptyTitle="GPU 메트릭이 없습니다"
      emptyDescription="dcgm-exporter/Prometheus 연동이 필요합니다."
    />
  )
}
