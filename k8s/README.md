# 배포 설정은 `myorg/deploy-infra` 로 이전됨 (2026-11-12)

이 폴더의 Helm 차트는 더 이상 배포에 쓰이지 않는다.
`monitoring-web` 의 배포 설정(이미지 태그, replicas, env 등)은 ArgoCD 가 읽는 **`myorg/deploy-infra` 의 `apps/monitoring-web/`** 에 있다.

- 이미지 태그: 이 저장소 main 에 push 되면 CI 가 자동으로 `deploy-infra` 의 태그를 갱신한다
- 그 외 설정 변경: `myorg/deploy-infra` 를 직접 수정(인프라 담당) → ArgoCD 가 자동 반영
- 클러스터에서 `kubectl edit` / `helm upgrade` 로 직접 바꾸면 ArgoCD 가 되돌린다
