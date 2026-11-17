# 배포 가이드

> 2026-11-12 이후 운영 배포는 Jenkins 빌드 → 배포 저장소(deploy-infra) 이미지 태그 → ArgoCD 동기화로 바뀌었습니다. 아래 Helm 직접 배포 절차는 이전 방식 기록이고, 노드 레지스트리(containerd) 설정과 pull Secret 부분은 지금도 같습니다.

이 대시보드를 Kubernetes 클러스터에 배포할 때 필요한 설정을 정리한 문서입니다.
주소와 계정 정보는 placeholder(`registry.example.com`, `org`)로 적었으니 환경에 맞게 바꿔서 사용하세요.

## 구성 요소

| 리소스 | 이름 | 설명 |
|---|---|---|
| Deployment | `monitoring-web` | nginx(non-root, 8080)가 빌드된 SPA를 서빙하고 `/api`, `/socket.io`를 백엔드로 프록시 |
| Service | `local-ops-gui-svc` (80 → 8080) | Gateway의 HTTPRoute가 이 이름과 포트를 backendRef로 사용 |
| ConfigMap | `monitoring-web-config` | `BACKEND_HOST`. nginx 기동 시 envsubst로 `nginx.conf.template`에 들어감 |

백엔드(관리 서버)는 같은 네임스페이스(`infra`)의 `k8s-manager-svc:8000`에 있다고 가정합니다. 다른 위치라면 `config.BACKEND_HOST`를 바꾸면 됩니다.

## 1. 이미지 빌드

`main` 브랜치에 push하면 `.gitea/workflows/build.yaml`이 이미지를 빌드해서 레지스트리에 push합니다.
태그는 **커밋 SHA**입니다. 저장소 Secret에 `REGISTRY_USER`, `REGISTRY_TOKEN`이 등록돼 있어야 합니다.

수동으로 빌드할 때:

```bash
docker build --build-arg GIT_SHA=$(git rev-parse HEAD) \
  -t registry.example.com/org/monitoring-web:$(git rev-parse HEAD) .
docker push registry.example.com/org/monitoring-web:$(git rev-parse HEAD)
```

> `latest`처럼 같은 태그를 다시 쓰면 안 됩니다. `imagePullPolicy: IfNotPresent`이기 때문에
> 노드에 같은 태그 이미지가 이미 있으면 새 이미지를 받지 않아서 배포가 반영되지 않습니다.

## 2. 노드가 레지스트리에서 이미지를 받을 수 있게 설정

이미지 pull은 파드가 아니라 노드의 containerd가 **호스트 네트워크**에서 합니다.
그래서 `*.svc.cluster.local` 같은 클러스터 내부 DNS는 쓸 수 없고, 노드에서 접근 가능한 외부 주소를 `image.repository`에 넣어야 합니다.

레지스트리가 HTTP(비 TLS)라면 각 노드에 다음 설정이 필요합니다.

```toml
# /etc/containerd/certs.d/registry.example.com/hosts.toml
server = "http://registry.example.com"

[host."http://registry.example.com"]
  capabilities = ["pull", "resolve"]
```

`/etc/containerd/config.toml`에서 `config_path`가 비어 있으면 위 파일이 무시됩니다. 아래 **두 곳 모두** 채운 뒤 `systemctl restart containerd`를 실행합니다.

```toml
[plugins."io.containerd.cri.v1.images".registry]
  config_path = "/etc/containerd/certs.d"

[plugins."io.containerd.transfer.v1.local"]
  config_path = "/etc/containerd/certs.d"
```

## 3. 이미지 pull Secret

레지스트리가 private이면 `infra` 네임스페이스에 dockerconfigjson Secret이 있어야 합니다.
이름은 `values.yaml`의 `image.pullSecretName`(기본값 `gitea-registry-cred`)과 같아야 합니다.

```bash
kubectl create secret docker-registry gitea-registry-cred \
  --namespace infra \
  --docker-server=registry.example.com \
  --docker-username=<user> --docker-password=<token>
```

## 4. Helm 배포

```bash
helm upgrade --install monitoring-web ./k8s \
  --namespace infra \
  --set image.tag=<commit-sha>
```

배포 확인:

```bash
kubectl get pods -n infra -l app=monitoring-web
kubectl get pods -n infra -l app=monitoring-web \
  -o jsonpath='{.items[0].spec.containers[0].image}'
```

## 5. Gateway 연결

이 차트는 Gateway/HTTPRoute를 직접 만들지 않습니다. 같은 도메인을 쓰는 관리 서버 차트가 HTTPRoute를 관리하고, `/dashboard` 경로를 이 Service로 보냅니다.
직접 만든다면 다음과 같은 형태입니다.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: monitoring-web
  namespace: infra
spec:
  parentRefs:
    - name: infra-gateway
  hostnames:
    - monitor.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /dashboard
      backendRefs:
        - name: local-ops-gui-svc
          port: 80
```

경로 앞부분(`/dashboard`)을 지우지 않고 그대로 넘겨야 합니다. nginx가 `/dashboard/` 요청을 받아 정적 파일 루트로 `alias`하도록 설정돼 있기 때문입니다.

## 배포 후 화면이 바뀌지 않을 때

서버에는 새 버전이 배포됐는데 브라우저가 이전 파일을 캐시하고 있는 경우가 많습니다.
실제로 배포된 버전은 서버가 내려주는 JS 번들을 직접 받아서 확인할 수 있습니다.

```bash
curl -s https://monitor.example.com/dashboard/ | grep -o 'assets/index-[^"]*\.js'
curl -s https://monitor.example.com/dashboard/assets/index-XXXX.js | grep -c "찾을 문자열"
```

서버 쪽 결과가 맞다면 브라우저에서 강력 새로고침(Ctrl+Shift+R)을 하면 됩니다.
