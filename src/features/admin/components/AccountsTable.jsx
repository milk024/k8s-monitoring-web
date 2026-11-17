import { DataTable } from '../../../shared/components/DataTable.jsx'
import { formatAge } from '../../../shared/utils/formatters.js'

const keyOf = (row) => `${row.namespace}/${row.service_account}`

export function AccountsTable({ accounts, loading, revokingKey, onRevoke }) {
  const columns = [
    { key: 'namespace', header: '네임스페이스' },
    { key: 'service_account', header: '계정' },
    { key: 'rbac_template', header: '권한' },
    { key: 'issued_by', header: '발급자' },
    {
      key: 'issued_at',
      header: '발급',
      render: (row) => <span title={new Date(row.issued_at).toLocaleString()}>{formatAge(row.issued_at)} 전</span>,
    },
    {
      key: 'status',
      header: '상태',
      render: (row) =>
        row.revoked_at ? (
          <span className="cw-muted text-xs" title={new Date(row.revoked_at).toLocaleString()}>회수됨</span>
        ) : (
          <span className="rounded bg-[var(--cw-ok-bg)] px-2 py-0.5 text-xs font-medium text-[var(--cw-ok)]">사용 중</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        !row.revoked_at && (
          <button
            type="button"
            onClick={() => onRevoke(row)}
            disabled={revokingKey === keyOf(row)}
            className="cw-border rounded-md border px-2.5 py-1 text-xs font-medium text-[var(--cw-alarm)] hover:bg-[var(--cw-alarm-bg)] disabled:opacity-50"
          >
            {revokingKey === keyOf(row) ? '회수 중...' : '회수'}
          </button>
        ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={accounts}
      rowKey="id"
      loading={loading}
      emptyTitle="발급한 계정이 없습니다"
      emptyDescription="위 양식으로 개발자 계정을 발급하세요"
    />
  )
}
