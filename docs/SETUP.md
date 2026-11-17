# K8s Monitor Web

> 포트폴리오 공개용 스냅샷입니다. 실제 IP·도메인·조직명은 예시값(`10.0.0.x`, `example.ac.kr`, `myorg`)으로 바꿨고 비밀값은 포함하지 않습니다. 전체 소개는 [k8s-manager](https://github.com/milk024/k8s-manager) 를 보세요.

Kubernetes 클러스터 모니터링/관리용 대시보드 웹 클라이언트.
`k8s_manager` 서버(`../k8s_manager`)와 REST + socket.io로 연동됩니다.

## 구조

- `src/config` – API 클라이언트, 상태 뱃지 톤 정의, 목(mock) 데이터
- `src/core` – 전역 상태(zustand), socket.io 클라이언트, 실시간 연동 훅
- `src/features/*` – 도메인별 기능 (dashboard, pods, deployments, monitoring, namespaces, gitea, settings)
- `src/layout` – 대시보드 레이아웃 (Sidebar, Topbar)
- `src/routes` – 라우터 정의
- `src/shared` – 공통 UI 컴포넌트/유틸

## 실행

```bash
npm install
npm run dev
```

기본적으로 `/api/...`, `/socket.io/...` 요청은 vite 프록시를 통해 `http://localhost:8000`
(k8s_manager 서버 기본 포트)으로 전달됩니다. 백엔드가 응답하지 않으면 REST 응답은 자동으로 목
데이터로 대체됩니다(socket.io는 연결이 안 되면 실시간 갱신 없이 REST 폴링 결과만 보여줌). 프록시
대상을 바꾸려면 `VITE_K8S_API_PROXY` 환경 변수를 지정하세요.

앱은 `/dashboard` 하위 경로에서 서빙되도록 되어 있습니다(아래 ADR-005 참고). dev 서버도
`http://localhost:5173/`로 접속하면 `/dashboard/`로 자동 리다이렉트됩니다.

## k8s_manager와의 연동 범위

`k8s_manager` 서버는 아래 엔드포인트만 제공하며, 이 대시보드는 그 범위 안에서 동작합니다.

- `GET /api/k8s/pods`, `/api/k8s/deployments`, `/api/k8s/events` — namespace 쿼리 파라미터로 필터링
- `GET /api/monitor/pods`, `/api/monitor/gpu` — Pod CPU/메모리, GPU 사용률 (각각 metrics-server,
  Prometheus/dcgm-exporter 필요)
- `GET /api/gitea/repos`, `POST /api/gitea/repos/:owner/:repo/webhook` — 저장소 목록/웹훅 등록
- `GET /api/gitea/repos/:owner/:repo/builds` — Jenkins 빌드 이력(Gitea 커밋 상태 `jenkins/build`, ADR-0052)
- `GET /api/gitea/builds` — 빌드 화면(`/builds`): 앱별 최근 빌드·최근 성공. 배포 상태 화면의 '빌드 대비'(최신 반영/배포 대기/빌드 중/빌드 실패)도 이 값과 배포 이미지 태그를 비교
- `GET /api/k8s/pods/:name/related`, `/api/k8s/pods/:name/logs?previous=&tailLines=`, `/api/k8s/events?pod=` —
  Pod 상세 화면(`/pods/:namespace/:name`): 개요·연관 리소스·로그(에러만 보기, 이전 컨테이너)·이벤트
- `GET /api/k8s/argocd/apps` — 배포 상태 화면(`/deploy-status`, 읽기 전용). `/argocd` 는 게이트웨이가 ArgoCD 본체로 보내므로 쓰지 않는다

admin-manager(`/api-admin`, 관리자 로그인 필요):

- `/api/manifests*` — 네임스페이스 YAML 화면(`/namespaces/:namespace`): 화이트리스트 Kind 조회·생성·수정·삭제, 변경 이력.
  ArgoCD 가 관리하는 리소스(`argocd.argoproj.io/tracking-id`)는 읽기 전용(서버도 409 로 거부), Secret 은 다루지 않음
- socket.io(`dashboard` room): `monitor:pods`/`monitor:gpu`(실시간 사용량), `k8s:pods`(파드 목록),
  `ci:build`(Jenkins 빌드 상태 변화), `monitor:error`, `alert:triggered`, `gitea:push` —
  대시보드/파드/모니터링/Gitea 페이지가 REST 초기 로드 후 이 이벤트로 실시간 갱신됨
- `alert:triggered`(Alertmanager 웹훅 → `k8s_manager` `/webhook/alert` → 소켓)는 `/alerts`
  페이지에서 목록으로 확인 가능. Alertmanager의 `alerts[]` payload(`status`/`labels`/`annotations`/
  `startsAt`/`fingerprint`)를 그대로 사용하며, `fingerprint` 기준으로 같은 알람의 firing→resolved
  전이를 새 항목이 아니라 상태 갱신으로 처리함. REST 히스토리 조회 API는 없어서(서버 재시작/새로고침
  전까지) 소켓으로 받은 것만 보임 — 영속 저장이 필요하면 백엔드에 별도 조회 API 추가 필요.

**서버에 없는 기능, 혹은 ADR로 보류 중인 기능**:

- Node 목록, Namespace 리소스 자체(Active/Age 등), K8s Service(v1)/NetworkPolicy 오브젝트, 클러스터
  요약 통계 전용 API가 없음 → Nodes/네트워킹 페이지 없음, 네임스페이스는 파드 목록에서 집계,
  대시보드 상단 통계는 클라이언트에서 조합 계산.
- Gitea CI/CD 빌드 실행 이력(성공/실패, 커밋, 브랜치)은 Gitea 페이지에서 조회 가능 — 실제 빌드는
  Gitea Actions + Runner Pod가 전담(ADR-0041). 다만 **개별 스텝(로그) 단위 조회는 아직 지원 안 함**
  (k8s_manager API 스펙에 없음).
- 이 대시보드를 외부 도메인/HTTPS로 직접 노출하는 것은 보류 — **ADR-006/008/030**(TLS 발급 주체·
  외부 노출 포트·Gateway 외부 IP)이 아직 대기 중이라 자체 Gateway/HTTPRoute는 만들지 않음.
  **ADR-005(경로 라우팅)는 확정**됨 — Gitea가 `/`를 이미 점유하고 있어 이 GUI는 `/dashboard`
  경로로 노출하기로 결정됐고, 그 결정은 아래처럼 코드에 반영돼 있음:
  - `vite.config.js`의 `base: '/dashboard/'` (프로덕션 빌드 자산 경로)
  - `src/routes/router.jsx`의 `basename: '/dashboard'` (클라이언트 라우팅)
  - `nginx.conf.template`이 `/dashboard/`를 파일 루트로 alias하고, `/`·`/dashboard`(슬래시 없음)는
    `/dashboard/`로 301 리다이렉트
  - `myorg/deploy-infra` 의 `apps/monitoring-web/values.yaml` Service 이름/포트(`local-ops-gui-svc:80`)를
    `apps/k8s-manager` 의 `gateway.guiServiceName`/`guiServicePort` 와 맞춤 (임의로 바꾸면 HTTPRoute 라우팅이 끊어짐)

## 빌드·배포 (ArgoCD, 2026-11-12~)

main 에 push 되면 Gitea Actions(`.gitea/workflows/build.yaml`)가 자동으로 처리한다. 사람이 `helm` 이나 `kubectl` 로 배포하지 않는다.

1. 이미지 빌드 → `gpu.example.ac.kr/myorg/monitoring-web:<커밋 SHA>` push (`infra-ci`)
2. `ci/bump-deploy.sh` 가 **`myorg/deploy-infra` 의 `apps/monitoring-web/values.yaml` image.tag** 를 갱신 커밋
3. ArgoCD(Application `monitoring-web`, 자동 동기화)가 감지해 반영

- 배포 설정(env, replicas, 라우트 등)은 이 저장소가 아니라 **`myorg/deploy-infra` 의 `apps/monitoring-web/`** 에서 바꾼다. 이 저장소의 `k8s/` 차트는 그쪽으로 이전·삭제됐다.
- 클러스터에서 직접 고치면 ArgoCD 가 되돌린다. 비밀값은 어느 저장소에도 커밋하지 않는다(클러스터 Secret 으로 관리).
