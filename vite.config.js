import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const K8S_MANAGER_TARGET = process.env.VITE_K8S_API_PROXY || 'http://localhost:8000'

// 배포된 화면에서 지금 실제로 뭐가 떠 있는지 확인할 수 있도록 빌드 시점에 굽는다.
// package.json 버전(수동 semver 배포)과 커밋 SHA(Gitea Actions 자동 배포, VITE_GIT_SHA
// 빌드 인자로 주입) 둘 다 찍는다 — 배포 방식과 무관하게 항상 신뢰 가능한 값.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))

// ADR-005(k8s_manager): "/"는 Gitea HTTPRoute가 이미 점유하고 있어, 이 GUI는
// /dashboard 경로로 양보해 노출한다. Envoy Gateway가 prefix를 벗기지 않고 그대로
// 넘기므로(k8s_manager/k8s/templates/httproute.yaml), 빌드 산출물도 /dashboard/ 기준으로
// 자산 경로를 잡아야 한다.
const BASE_PATH = '/dashboard/'

// vite dev 서버는 base와 무관하게 "/"에서도 그대로 서빙해버려서, 라우터의
// basename("/dashboard")과 실제 위치가 어긋나 클라이언트 사이드 내비게이션이 깨진다.
// 운영 환경(nginx.conf.template)과 동일하게 "/" 접근을 /dashboard/로 리다이렉트해 맞춘다.
function redirectRootToBase() {
  return {
    name: 'redirect-root-to-base',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/') {
          res.writeHead(302, { Location: BASE_PATH })
          res.end()
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: BASE_PATH,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss(), tsconfigPaths(), redirectRootToBase()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: K8S_MANAGER_TARGET,
        changeOrigin: true,
      },
      '/socket.io': {
        target: K8S_MANAGER_TARGET,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
