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

// 2026-11-12: 게이트웨이(gpu.example.ac.kr) 경로 재배치 — 이 GUI는 "/", Gitea 는 /gitea,
// k8s_manager 는 /api-k8s-m. (이전 ADR-005: Gitea 가 "/" 를 점유해서 /dashboard 로 양보했었음)
const BASE_PATH = '/'

export default defineConfig({
  base: BASE_PATH,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 5173,
    // 운영 nginx.conf.template 과 같은 매핑: /api-k8s-m/socket.io → /socket.io, /api-k8s-m/* → /api/*
    proxy: {
      '/api-k8s-m/socket.io': {
        target: K8S_MANAGER_TARGET,
        changeOrigin: true,
        ws: true,
        rewrite: (p) => p.replace(/^\/api-k8s-m/, ''),
      },
      '/api-k8s-m': {
        target: K8S_MANAGER_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api-k8s-m/, '/api'),
      },
    },
  },
})
