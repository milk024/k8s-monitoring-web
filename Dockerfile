# 빌드 스테이지: Vite 정적 자산 생성 (버전 고정, k8s_manager ADR-003/039과 동일 컨벤션)
FROM node:22.16.0-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# 화면에서 실제 배포된 빌드를 식별할 수 있도록 커밋 SHA를 굽는다 (수동 빌드 시 미지정하면 "dev").
ARG GIT_SHA=dev
ENV VITE_GIT_SHA=$GIT_SHA
RUN npm run build

# 서빙 스테이지: nginx로 정적 파일 서빙 + 백엔드(k8s_manager) API/소켓 리버스 프록시.
# root로 실행하지 않음(ADR-039와 동일 원칙) — 표준 nginx:alpine에 USER만 non-root로 바꾸면
# /var/cache/nginx, /etc/nginx/conf.d 쓰기 권한이 없어 기동에 실패하므로, 그 문제를 이미
# 해결해 배포하는 nginx 공식 non-root 전용 이미지(nginxinc/nginx-unprivileged)를 사용한다.
# 기본 리슨 포트도 이미 8080(비특권 포트)으로 맞춰져 있음.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# ADR-004: GUI는 관리서버(k8s_manager)와 같은 namespace(infra) 안의 별도 Pod/Service로 배포됨.
# 백엔드 접근은 클러스터 내부 Service DNS를 기본값으로 사용하며, Helm values로 덮어쓸 수 있음.
ENV BACKEND_HOST=k8s-manager-svc.infra.svc.cluster.local:8000

EXPOSE 8080
