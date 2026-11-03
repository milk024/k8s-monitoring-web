import { useEffect, useState } from 'react'
import { useAppState } from '../../core/AppState.ts'
import { fetchDeployments } from './services/deploymentService.js'
import { DeploymentTable } from './components/DeploymentTable.jsx'

export function DeploymentsPage() {
  const selectedNamespace = useAppState((s) => s.selectedNamespace)
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchDeployments(selectedNamespace).then((data) => {
      setDeployments(data)
      setLoading(false)
    })
  }, [selectedNamespace])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="cw-text text-lg font-semibold">디플로이먼트</h1>
        <p className="cw-muted text-sm">디플로이먼트별 레플리카 상태를 확인합니다.</p>
      </div>
      <DeploymentTable deployments={deployments} loading={loading} />
    </div>
  )
}
