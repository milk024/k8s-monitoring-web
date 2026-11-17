// CI (Jenkins) — 빌드만 한다. 배포는 ArgoCD 가 myorg/deploy-infra 를 보고 한다.
//   1) Kaniko 로 이미지 빌드 → gpu.example.ac.kr/myorg/<APP>:<커밋 SHA> push
//   2) ci/bump-deploy.sh 로 deploy-infra 의 apps/<APP>/values.yaml image.tag 갱신
// 빌드 Pod 는 infra 팀 cloud(네임스페이스 jenkins-infra)에서 뜨고, 쓰기 토큰은 그 네임스페이스 Secret 에서만 읽는다
//   registry    : 이미지 push (infra-ci, write:package)
//   deploy-repo : deploy-infra push (infra-ci, write:repository — infra-ci 는 deploy-infra 만 push 가능)
// Jenkins Job/cloud 정의: k8s_manager/k8s/jenkins-values.yaml, 팀 네임스페이스: k8s_manager/k8s/jenkins-teams.yaml
def APP = 'monitoring-web'

pipeline {
  agent {
    kubernetes {
      cloud 'infra'
      yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:v1.23.2-debug
      command: ["/busybox/cat"]
      tty: true
      resources:
        requests: {cpu: 500m, memory: 1Gi}
        limits: {memory: 4Gi}
      volumeMounts:
        - {name: registry, mountPath: /kaniko/.docker}
    - name: tools
      image: buildpack-deps:bookworm-scm
      command: ["cat"]
      tty: true
      env:
        - {name: DEPLOY_REPO_URL, value: "https://gpu.example.ac.kr/gitea/myorg/deploy-infra.git"}
        - name: DEPLOY_REPO_USER
          valueFrom: {secretKeyRef: {name: deploy-repo, key: username}}
        - name: DEPLOY_REPO_TOKEN
          valueFrom: {secretKeyRef: {name: deploy-repo, key: token}}
      resources:
        requests: {cpu: 50m, memory: 64Mi}
  volumes:
    - name: registry
      secret:
        secretName: registry
        items: [{key: .dockerconfigjson, path: config.json}]
'''
    }
  }
  options {
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 30, unit: 'MINUTES')
  }
  stages {
    // 빌드 시작을 Gitea 커밋 상태(pending)로 남긴다 → 대시보드·Gitea 에 "빌드 중" 표시. 끝나면 post 가 success/failure 로 덮어쓴다
    stage('Report pending') {
      steps {
        container('tools') {
          sh """
set +x
curl -sS -o /dev/null -w 'commit status: %{http_code}\\n' -X POST \\
  -H "Authorization: token \$DEPLOY_REPO_TOKEN" -H 'Content-Type: application/json' \\
  -d '{"state":"pending","context":"jenkins/build","description":"Jenkins #${env.BUILD_NUMBER} 빌드 중","target_url":"${env.BUILD_URL}"}' \\
  "https://gpu.example.ac.kr/gitea/api/v1/repos/myorg/${APP}/statuses/\$GIT_COMMIT" || true
"""
        }
      }
    }
    stage('Build & push') {
      steps {
        container('kaniko') {
          sh "/kaniko/executor --context \"\$WORKSPACE\" --dockerfile \"\$WORKSPACE/Dockerfile\" --build-arg GIT_SHA=\$GIT_COMMIT --destination gpu.example.ac.kr/myorg/${APP}:\$GIT_COMMIT"
        }
      }
    }
    stage('Update deploy repo') {
      steps {
        container('tools') {
          sh "SOURCE_REPO=myorg/${APP} bash ci/bump-deploy.sh ${APP} \"\$GIT_COMMIT\""
        }
      }
    }
  }
  // 빌드 결과를 Gitea 커밋 상태(체크 표시)로 남긴다. 팀 네임스페이스의 deploy-repo 토큰(팀 CI 계정)을 쓴다.
  // 팀 CI 계정은 자기 소스 저장소에만 쓰기 권한(ci-<팀>-status 팀)이 있고, main 은 보호돼 직접 push 할 수 없다.
  post {
    always {
      container('tools') {
        sh """
set +x
curl -sS -o /dev/null -w 'commit status: %{http_code}\\n' -X POST \\
  -H "Authorization: token \$DEPLOY_REPO_TOKEN" -H 'Content-Type: application/json' \\
  -d '{"state":"${currentBuild.currentResult == 'SUCCESS' ? 'success' : 'failure'}","context":"jenkins/build","description":"Jenkins #${env.BUILD_NUMBER} ${currentBuild.currentResult}","target_url":"${env.BUILD_URL}"}' \\
  "https://gpu.example.ac.kr/gitea/api/v1/repos/myorg/${APP}/statuses/\$GIT_COMMIT" || true
"""
      }
    }
  }
}
