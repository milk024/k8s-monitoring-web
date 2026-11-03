import { EmptyState } from '../../../shared/components/EmptyState.jsx'

export function RecentPushes({ pushes }) {
  if (!pushes.length) {
    return <EmptyState title="최근 push 이벤트가 없습니다" description="Gitea 웹훅이 도착하면 실시간으로 표시됩니다." />
  }

  return (
    <ul className="cw-border divide-y">
      {pushes.map((push, i) => (
        <li key={i} className="py-3">
          <p className="text-sm font-medium cw-text">{push.repo ?? '-'}</p>
          <p className="text-xs cw-muted">{push.ref} · 커밋 {push.commits?.length ?? 0}개</p>
        </li>
      ))}
    </ul>
  )
}
