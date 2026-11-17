import { ExternalLink } from 'lucide-react'
import { DataTable } from '../../../shared/components/DataTable.jsx'
import { StatusBadge } from '../../../shared/components/StatusBadge.jsx'

const STATUS_LABELS = { success: '성공', failure: '실패', error: '오류', pending: '빌드 중' }

const columns = [
  {
    key: 'buildNumber',
    header: '#',
    render: (row) =>
      row.buildNumber ? (
        row.url ? (
          <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--cw-accent)] hover:underline">
            #{row.buildNumber} <ExternalLink size={11} />
          </a>
        ) : (
          `#${row.buildNumber}`
        )
      ) : (
        <span className="cw-muted">-</span>
      ),
  },
  {
    key: 'title',
    header: '커밋',
    render: (row) => (
      <span className="inline-flex items-center gap-2">
        <code className="cw-muted text-xs">{row.shortSha}</code>
        <span className="max-w-[28rem] truncate" title={row.title}>{row.title}</span>
      </span>
    ),
  },
  { key: 'branch', header: '브랜치' },
  {
    key: 'status',
    header: '상태',
    render: (row) =>
      row.status === 'none' ? <span className="cw-muted text-xs">빌드 없음</span> : <StatusBadge status={row.status} label={STATUS_LABELS[row.status]} />,
  },
  { key: 'age', header: '갱신', render: (row) => (row.updatedAt ? <span title={new Date(row.updatedAt).toLocaleString()}>{row.age} 전</span> : '-') },
]

// Jenkins 빌드 이력 — main 최근 커밋과 그 커밋의 Gitea 상태 jenkins/build.
// [skip ci] 커밋처럼 빌드하지 않은 커밋은 '빌드 없음'으로 보인다.
export function BuildsTable({ builds, loading }) {
  return (
    <DataTable
      columns={columns}
      rows={builds}
      rowKey="id"
      loading={loading}
      emptyTitle="빌드 이력이 없습니다"
      emptyDescription="main 에 push 되면 Jenkins 빌드 결과가 여기 표시됩니다."
    />
  )
}
