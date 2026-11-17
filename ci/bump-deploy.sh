#!/usr/bin/env bash
# 배포 저장소(deploy-infra)의 apps/<앱>/values.yaml image.tag 를 갱신해 커밋·push 한다. ArgoCD 가 그 변경을 동기화한다.
# CI 도구와 무관하게 쓰도록 스크립트로 분리 (Gitea Actions 지금, Jenkinsfile 이후 동일하게 호출).
#
# 사용: ci/bump-deploy.sh <앱이름> <이미지 태그(커밋 SHA 40자)>
# 환경변수:
#   DEPLOY_REPO_TOKEN  (필수) infra-ci 토큰. deploy-infra 쓰기 권한만 있음
#   DEPLOY_REPO_URL    기본 https://gpu.example.ac.kr/gitea/myorg/deploy-infra.git
#   DEPLOY_REPO_USER   기본 infra-ci
#   SOURCE_REPO        커밋 메시지에 남길 소스 저장소 이름
set -euo pipefail

APP="${1:?app name}"
TAG="${2:?image tag}"
URL="${DEPLOY_REPO_URL:-https://gpu.example.ac.kr/gitea/myorg/deploy-infra.git}"
CI_USER="${DEPLOY_REPO_USER:-infra-ci}"
: "${DEPLOY_REPO_TOKEN:?DEPLOY_REPO_TOKEN is required}"
[[ "$TAG" =~ ^[0-9a-f]{40}$ ]] || { echo "image tag must be a full 40-char commit SHA: $TAG" >&2; exit 1; }

# 토큰을 원격 URL·git 설정 파일에 남기지 않도록 요청 헤더로만 전달
AUTH="Authorization: Basic $(printf '%s:%s' "$CI_USER" "$DEPLOY_REPO_TOKEN" | base64 | tr -d '\n')"
g() { git -c credential.helper= -c http.extraHeader="$AUTH" "$@"; }

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
g clone -q --depth 20 --branch main "$URL" "$WORK/repo"
cd "$WORK/repo"

F="apps/$APP/values.yaml"
[ -f "$F" ] || { echo "$F not found in deploy repo" >&2; exit 1; }

set_tag() {
  # 최상위 image: 블록 안의 첫 tag: 한 줄만 교체
  awk -v tag="$TAG" '
    /^image:/                      { inimg=1; print; next }
    inimg && /^[^ #]/              { inimg=0 }
    inimg && /^  tag:/ && !done    { print "  tag: " tag; done=1; next }
                                   { print }
    END { if (!done) exit 3 }' "$F" > "$F.new"
  mv "$F.new" "$F"
}

for attempt in 1 2 3 4 5; do
  set_tag
  if git diff --quiet; then echo "$APP already at $TAG"; exit 0; fi
  git -c user.name="$CI_USER" -c user.email="admin+$CI_USER@example.ac.kr" commit -q -am "$APP: image.tag ${TAG:0:7}" -m "source: ${SOURCE_REPO:-unknown}@$TAG"
  if g push -q origin HEAD:main; then echo "pushed $APP image.tag=$TAG"; exit 0; fi
  echo "push rejected (attempt $attempt), rebasing on latest main" >&2
  git reset -q --hard HEAD~1
  g pull -q --ff-only origin main
  sleep $((attempt * 2))
done
echo "failed to update deploy repo" >&2; exit 1
