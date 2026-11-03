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

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <DashboardLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'pods', element: <PodsPage /> },
        { path: 'deployments', element: <DeploymentsPage /> },
        { path: 'monitoring', element: <MonitoringPage /> },
        { path: 'namespaces', element: <NamespacesPage /> },
        { path: 'gitea', element: <GiteaPage /> },
        { path: 'alerts', element: <AlertsPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },
  ],
  // ADR-005(k8s_manager): Gateway가 /dashboard로 이 GUI를 노출 — vite.config.js의 base와 동일하게 맞춘다.
  { basename: '/dashboard' },
)
