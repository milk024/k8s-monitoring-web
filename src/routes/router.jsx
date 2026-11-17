import { createBrowserRouter } from 'react-router-dom'
import { DashboardLayout } from '../layout/DashboardLayout.jsx'
import { DashboardPage } from '../features/dashboard/index.jsx'
import { PodsPage } from '../features/pods/index.jsx'
import { DeploymentsPage } from '../features/deployments/index.jsx'
import { MonitoringPage } from '../features/monitoring/index.jsx'
import { NamespacesPage } from '../features/namespaces/index.jsx'
import { GiteaPage } from '../features/gitea/index.jsx'
import { AlertsPage } from '../features/alerts/index.jsx'
import { SettingsPage } from '../features/settings/index.jsx'
import { AdminPage } from '../features/admin/index.jsx'
import { ArgoCdPage } from '../features/argocd/index.jsx'
import { BuildsPage } from '../features/builds/index.jsx'
import { PodDetailPage } from '../features/pods/PodDetailPage.jsx'
import { NamespaceDetailPage } from '../features/namespaces/NamespaceDetailPage.jsx'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <DashboardLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'pods', element: <PodsPage /> },
        { path: 'pods/:namespace/:name', element: <PodDetailPage /> },
        { path: 'deployments', element: <DeploymentsPage /> },
        { path: 'monitoring', element: <MonitoringPage /> },
        { path: 'namespaces', element: <NamespacesPage /> },
        { path: 'namespaces/:namespace', element: <NamespaceDetailPage /> },
        { path: 'builds', element: <BuildsPage /> },
        { path: 'deploy-status', element: <ArgoCdPage /> },
        { path: 'repos', element: <GiteaPage /> },
        { path: 'alerts', element: <AlertsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'admin', element: <AdminPage /> },
      ],
    },
  ],
  // 2026-11-12: 게이트웨이가 이 GUI를 "/" 로 노출 (Gitea 는 /gitea 로 이동). vite.config.js 의 base 와 맞춘다.
  { basename: '/' },
)
