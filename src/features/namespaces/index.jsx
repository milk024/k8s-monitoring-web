import { useEffect, useState } from 'react'
import { fetchNamespaces } from './services/namespaceService.js'
import { NamespaceTable } from './components/NamespaceTable.jsx'

export function NamespacesPage() {
  const [namespaces, setNamespaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchNamespaces().then((data) => {
      setNamespaces(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="cw-text text-lg font-semibold">네임스페이스</h1>
        <p className="cw-muted text-sm">클러스터 내 네임스페이스 목록입니다.</p>
      </div>
      <NamespaceTable namespaces={namespaces} loading={loading} />
    </div>
  )
}
