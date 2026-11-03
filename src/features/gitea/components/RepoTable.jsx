import { DataTable } from '../../../shared/components/DataTable.jsx'

export function RepoTable({ repos, loading, onRegisterWebhook, registeringName }) {
  const columns = [
    { key: 'name', header: '저장소' },
    { key: 'owner', header: '소유자' },
    { key: 'private', header: '공개 여부', render: (row) => (row.private ? '비공개' : '공개') },
    { key: 'updatedAge', header: '최근 업데이트' },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          type="button"
          onClick={() => onRegisterWebhook(row)}
          disabled={registeringName === row.name}
          className="cw-surface cw-border cw-text rounded-md border px-2.5 py-1 text-xs font-medium hover:cw-surface-2 disabled:opacity-50"
        >
          {registeringName === row.name ? '등록 중...' : '웹훅 등록'}
        </button>
      ),
    },
  ]

  return (
    <DataTable columns={columns} rows={repos} rowKey="fullName" loading={loading} emptyTitle="저장소가 없습니다" />
  )
}
