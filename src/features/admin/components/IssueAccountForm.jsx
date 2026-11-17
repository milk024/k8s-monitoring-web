import { useState } from 'react'
import { UserPlus } from 'lucide-react'

const inputClass = 'w-full cw-surface-2 cw-border cw-text rounded-md border px-3 py-2 text-sm'
// 서버(admin-manager)와 같은 규칙: 영문 소문자·숫자·하이픈, 50자 이하, 처음과 끝은 영문/숫자
const NAME_RE = /^[a-z0-9]([-a-z0-9]{0,48}[a-z0-9])?$/

export function IssueAccountForm({ namespaces, templates, onIssue, issuing }) {
  const [namespace, setNamespace] = useState('')
  const [name, setName] = useState('')
  const [rbacTemplate, setRbacTemplate] = useState('readonly')

  const ns = namespace || namespaces[0] || ''
  const nameValid = NAME_RE.test(name)
  const selectedTemplate = templates.find((t) => t.name === rbacTemplate)

  async function onSubmit(e) {
    e.preventDefault()
    if (!nameValid || !ns) return
    const ok = await onIssue({ namespace: ns, name, rbacTemplate })
    if (ok) setName('')
  }

  return (
    <form onSubmit={onSubmit} className="cw-surface cw-border space-y-4 rounded-md border p-5">
      <div className="flex items-center gap-2">
        <UserPlus size={16} className="cw-accent-text" />
        <h2 className="cw-text text-sm font-semibold">개발자 계정 발급</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="cw-muted mb-1.5 block text-xs font-medium" htmlFor="issue-ns">네임스페이스</label>
          <select id="issue-ns" value={ns} onChange={(e) => setNamespace(e.target.value)} className={inputClass}>
            {namespaces.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="cw-muted mb-1.5 block text-xs font-medium" htmlFor="issue-name">계정 이름</label>
          <input
            id="issue-name"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            placeholder="예: dev9-rag"
            className={inputClass}
          />
          {name && !nameValid && (
            <p className="mt-1 text-xs text-[var(--cw-alarm)]">영문 소문자·숫자·하이픈, 50자 이하 (처음과 끝은 영문/숫자)</p>
          )}
        </div>
        <div>
          <label className="cw-muted mb-1.5 block text-xs font-medium" htmlFor="issue-tpl">권한</label>
          <select id="issue-tpl" value={rbacTemplate} onChange={(e) => setRbacTemplate(e.target.value)} className={inputClass}>
            {templates.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>
      {selectedTemplate && <p className="cw-muted text-xs">{selectedTemplate.description}</p>}
      <button
        type="submit"
        disabled={!nameValid || !ns || issuing}
        className="cw-accent-bg rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {issuing ? '발급 중...' : '발급'}
      </button>
    </form>
  )
}
