import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminApi } from './services/adminApi.js'
import { IssueAccountForm } from './components/IssueAccountForm.jsx'
import { IssuedKubeconfig } from './components/IssuedKubeconfig.jsx'
import { AccountsTable } from './components/AccountsTable.jsx'
import { AuditLogPanel } from './components/AuditLogPanel.jsx'
import { GiteaPanel } from './components/GiteaPanel.jsx'

// 로그인은 레이아웃(DashboardLayout)이 사이트 입구에서 받는다. 로그아웃은 상단 바.
export function AdminPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="cw-text text-lg font-semibold">관리자</h1>
        <p className="cw-muted text-sm">개발자 K8s 계정(kubeconfig) 발급·회수, Gitea 사용자·팀 관리, 관리 작업 이력. admin-manager 를 통해서만 처리합니다.</p>
      </div>
      <AdminTabs />
    </div>
  )
}

const TABS = [
  { key: 'accounts', label: 'K8s 계정 발급' },
  { key: 'gitea', label: 'Gitea 사용자' },
  { key: 'audit', label: '작업 이력' },
]

function AdminTabs() {
  const [tab, setTab] = useState('accounts')
  return (
    <div className="space-y-4">
      <div role="tablist" className="cw-border flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium ${
              tab === t.key ? 'cw-text border-[var(--cw-accent)]' : 'cw-muted border-transparent hover:cw-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'accounts' && <AccountsPanel />}
      {tab === 'gitea' && <GiteaPanel />}
      {tab === 'audit' && <AuditLogPanel />}
    </div>
  )
}

function AccountsPanel() {
  const [namespaces, setNamespaces] = useState([])
  const [templates, setTemplates] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState(false)
  const [issued, setIssued] = useState(null)
  const [revokingKey, setRevokingKey] = useState(null)

  const reload = useCallback(async () => {
    try {
      setAccounts(await AdminApi.getAccounts())
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([AdminApi.getNamespaces(), AdminApi.getTemplates()])
      .then(([ns, tpl]) => {
        setNamespaces(ns)
        setTemplates(tpl)
      })
      .catch((err) => toast.error(err.message))
    reload()
  }, [reload])

  async function onIssue(input) {
    setIssuing(true)
    try {
      setIssued(await AdminApi.issueAccount(input))
      await reload()
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setIssuing(false)
    }
  }

  async function onRevoke(row) {
    const key = `${row.namespace}/${row.service_account}`
    if (!window.confirm(`${key} 계정을 회수할까요?\n이 계정으로 발급한 kubeconfig 는 즉시 쓸 수 없게 됩니다.`)) return
    setRevokingKey(key)
    try {
      await AdminApi.revokeAccount(row.namespace, row.service_account)
      toast.success(`${key} 회수 완료`)
      if (issued && `${issued.namespace}/${issued.name}` === key) setIssued(null)
      await reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRevokingKey(null)
    }
  }

  return (
    <div className="space-y-4">
      <IssueAccountForm namespaces={namespaces} templates={templates} onIssue={onIssue} issuing={issuing} />
      {issued && <IssuedKubeconfig issued={issued} onClose={() => setIssued(null)} />}
      <div>
        <h2 className="cw-text mb-2 text-sm font-semibold">발급 이력</h2>
        <AccountsTable accounts={accounts} loading={loading} revokingKey={revokingKey} onRevoke={onRevoke} />
      </div>
    </div>
  )
}
