// 게이트웨이 경로 배치 (gpu.example.ac.kr, 2026-11-12)
//   /            → 이 GUI (monitoring-web)
//   /gitea/      → Gitea
//   /api-k8s-m/  → k8s_manager. 이 GUI의 nginx가 클러스터 내부 k8s-manager-svc 의 /api, /socket.io 로 넘긴다
// 빌드 시 VITE_API_BASE_URL / VITE_SOCKET_PATH 로 덮어쓸 수 있다.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api-k8s-m'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? ''
export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH ?? '/api-k8s-m/socket.io'

// /api-admin/ → admin-manager (고권한 관리 서버). 게이트웨이가 직접 라우팅하며 관리자 JWT 가 필요하다.
export const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL ?? '/api-admin'
