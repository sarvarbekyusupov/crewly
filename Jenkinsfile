// Jenkinsfile — crewly monorepo CI/CD
//
// Required Jenkins credentials:
//   docker-registry-url    — String: e.g. "registry.example.com"
//   docker-registry-creds  — Username+Password for that registry
//   deploy-api-url         — String: public API URL, e.g. "https://api.yourdomain.com"
//                            (baked into frontend image as NUXT_PUBLIC_API_BASE)
//   deploy-ssh-key         — SSH Private Key for deployment server
//   deploy-known-hosts     — Secret Text: known_hosts entry for the deploy server
//                            (obtain via: ssh-keyscan <deploy-host>)
//   deploy-host            — String: deployment server hostname/IP
//   deploy-user            — String: SSH user on deployment server
//
// Required plugins: Pipeline, Docker Pipeline, SSH Agent, Credentials Binding

pipeline {
  agent any

  environment {
    DOCKER_BUILDKIT          = '1'
    COMPOSE_DOCKER_CLI_BUILD = '1'
    TRIVY_VERSION            = '0.58.4'
    // Loaded once so REGISTRY is available in all stages and in post{}
    REGISTRY = credentials('docker-registry-url')
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 45, unit: 'MINUTES')
    disableConcurrentBuilds()
    timestamps()
  }

  stages {

    // ─────────────────────────────────────────────────────────────────────────
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_SHORT_SHA = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
          env.SAFE_BRANCH   = env.BRANCH_NAME.replaceAll(/[^a-zA-Z0-9._-]/, '-').toLowerCase()
          env.IS_MAINLINE   = (env.BRANCH_NAME in ['main', 'staging']).toString()
          echo "Branch: ${env.BRANCH_NAME}  SHA: ${env.GIT_SHORT_SHA}"
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Single pnpm install shared across lint → typecheck → test to avoid
    // reinstalling three times (saves ~30-60s even with cache volume)
    stage('Lint, Typecheck & Test') {
      steps {
        script {
          docker.image('node:22-alpine').inside(
            '--mount type=volume,src=pnpm-store,dst=/pnpm/store'
          ) {
            sh '''
              corepack enable pnpm
              pnpm config set store-dir /pnpm/store
              pnpm install --frozen-lockfile --prefer-offline
              pnpm --filter backend run lint
              pnpm --filter crewly-frontend run lint
              pnpm typecheck
              pnpm --filter backend run test
              pnpm --filter crewly-frontend run test
            '''
          }
        }
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'backend/coverage/junit.xml'
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Ensure buildx builder with cache support exists before parallel image builds
    stage('Setup Buildx') {
      when {
        anyOf { branch 'main'; branch 'staging'; branch 'develop' }
      }
      steps {
        sh '''
          docker buildx inspect ci-builder 2>/dev/null \
            || docker buildx create --name ci-builder --driver docker-container --use
          docker buildx inspect ci-builder --bootstrap
        '''
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    stage('Build & Push Images') {
      when {
        anyOf { branch 'main'; branch 'staging'; branch 'develop' }
      }
      parallel {

        stage('Backend Image') {
          steps {
            withCredentials([
              usernamePassword(
                credentialsId: 'docker-registry-creds',
                usernameVariable: 'REG_USER',
                passwordVariable: 'REG_PASS'
              )
            ]) {
              sh '''
                echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin
                docker buildx build \
                  --builder     ci-builder \
                  --cache-from "type=registry,ref=$REGISTRY/crewly/backend:buildcache" \
                  --cache-to   "type=registry,ref=$REGISTRY/crewly/backend:buildcache,mode=max" \
                  --tag        "$REGISTRY/crewly/backend:$GIT_SHORT_SHA" \
                  --tag        "$REGISTRY/crewly/backend:$SAFE_BRANCH" \
                  --file       backend/Dockerfile \
                  --push \
                  .
              '''
            }
          }
        }

        stage('Frontend Image') {
          steps {
            withCredentials([
              usernamePassword(
                credentialsId: 'docker-registry-creds',
                usernameVariable: 'REG_USER',
                passwordVariable: 'REG_PASS'
              ),
              string(credentialsId: 'deploy-api-url', variable: 'API_URL')
            ]) {
              sh '''
                echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin
                docker buildx build \
                  --builder     ci-builder \
                  --cache-from "type=registry,ref=$REGISTRY/crewly/frontend:buildcache" \
                  --cache-to   "type=registry,ref=$REGISTRY/crewly/frontend:buildcache,mode=max" \
                  --tag        "$REGISTRY/crewly/frontend:$GIT_SHORT_SHA" \
                  --tag        "$REGISTRY/crewly/frontend:$SAFE_BRANCH" \
                  --build-arg  "NUXT_PUBLIC_API_BASE=$API_URL" \
                  --file       frontend/Dockerfile \
                  --push \
                  .
              '''
            }
          }
        }

      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Parallel so both images always scan even if one has CRITICAL findings
    stage('Security Scan') {
      when { anyOf { branch 'main'; branch 'staging'; branch 'develop' } }
      parallel {

        stage('Scan Backend') {
          steps {
            sh '''
              docker run --rm \
                aquasec/trivy:$TRIVY_VERSION image \
                --exit-code 1 \
                --severity CRITICAL \
                --format table \
                "$REGISTRY/crewly/backend:$GIT_SHORT_SHA"
            '''
          }
        }

        stage('Scan Frontend') {
          steps {
            sh '''
              docker run --rm \
                aquasec/trivy:$TRIVY_VERSION image \
                --exit-code 1 \
                --severity CRITICAL \
                --format table \
                "$REGISTRY/crewly/frontend:$GIT_SHORT_SHA"
            '''
          }
        }

      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    stage('Deploy') {
      when {
        anyOf { branch 'main'; branch 'staging' }
      }
      steps {
        script { env.DEPLOY_STARTED = 'true' }
        withCredentials([
          string(credentialsId: 'deploy-host',        variable: 'DEPLOY_HOST'),
          string(credentialsId: 'deploy-user',        variable: 'DEPLOY_USER'),
          string(credentialsId: 'deploy-known-hosts', variable: 'KNOWN_HOSTS_ENTRY'),
          sshUserPrivateKey(
            credentialsId: 'deploy-ssh-key',
            keyFileVariable: 'SSH_KEY_FILE'
          )
        ]) {
          sh '''
            mkdir -p ~/.ssh
            chmod 700 ~/.ssh
            echo "$KNOWN_HOSTS_ENTRY" > ~/.ssh/known_hosts
            chmod 600 ~/.ssh/known_hosts

            ssh -i "$SSH_KEY_FILE" \
                -o StrictHostKeyChecking=yes \
                -o BatchMode=yes \
                "$DEPLOY_USER@$DEPLOY_HOST" \
              "set -euo pipefail
               cd /srv/crewly

               # Preflight: production secrets must exist — copy .env.example and fill values
               test -f .env.production \
                 || { echo 'ERROR: .env.production missing on deploy server'; exit 1; }

               # Capture currently-running images for rollback before swapping
               PREV_BACKEND=\$(docker inspect \
                 \$(docker compose -f docker-compose.prod.yml ps -q backend 2>/dev/null | head -1) \
                 --format '{{.Config.Image}}' 2>/dev/null || echo '')
               PREV_FRONTEND=\$(docker inspect \
                 \$(docker compose -f docker-compose.prod.yml ps -q frontend 2>/dev/null | head -1) \
                 --format '{{.Config.Image}}' 2>/dev/null || echo '')
               if [ -n \"\$PREV_BACKEND\" ] && [ -n \"\$PREV_FRONTEND\" ]; then
                 printf 'IMAGE_BACKEND=%s\\nIMAGE_FRONTEND=%s\\n' \
                   \"\$PREV_BACKEND\" \"\$PREV_FRONTEND\" > .env.prev
               else
                 rm -f .env.prev
               fi

               # Write image tags for this build
               printf 'IMAGE_BACKEND=%s/crewly/backend:%s\\nIMAGE_FRONTEND=%s/crewly/frontend:%s\\n' \
                 $REGISTRY $GIT_SHORT_SHA $REGISTRY $GIT_SHORT_SHA > .env.image

               # Merge: .env.production has all compose vars; .env.image overrides image tags.
               # cat-merge avoids requiring Docker Compose >=2.24 (multi --env-file support).
               cat .env.production .env.image > .env.deploy

               docker compose -f docker-compose.prod.yml --env-file .env.deploy pull

               # Run migrations before swapping containers to avoid race conditions
               docker compose -f docker-compose.prod.yml --env-file .env.deploy \
                 run --rm backend pnpm exec prisma migrate deploy

               docker compose -f docker-compose.prod.yml --env-file .env.deploy \
                 up -d --no-build --remove-orphans

               rm -f .env.deploy .env.image
               docker image prune -f"
          '''
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    stage('Smoke Test') {
      when {
        anyOf { branch 'main'; branch 'staging' }
      }
      steps {
        withCredentials([
          string(credentialsId: 'deploy-host', variable: 'DEPLOY_HOST')
        ]) {
          retry(12) {
            sleep time: 10, unit: 'SECONDS'
            // /health is served on plain HTTP without redirect — see nginx.conf
            sh 'curl -sf "http://$DEPLOY_HOST/health"'
          }
        }
      }
    }

  } // end stages

  // ─────────────────────────────────────────────────────────────────────────
  post {
    success {
      script {
        def sha = env.GIT_SHORT_SHA ?: 'unknown'
        if (env.IS_MAINLINE == 'true') {
          echo "Deployed ${sha} (${env.BRANCH_NAME})"
        } else {
          echo "Build ${sha} passed — no deploy for branch '${env.BRANCH_NAME}'"
        }
      }
    }
    failure {
      script {
        if (env.DEPLOY_STARTED == 'true') {
          echo "Deploy or smoke test failed — attempting automatic rollback"
          withCredentials([
            string(credentialsId: 'deploy-host',        variable: 'DEPLOY_HOST'),
            string(credentialsId: 'deploy-user',        variable: 'DEPLOY_USER'),
            string(credentialsId: 'deploy-known-hosts', variable: 'KNOWN_HOSTS_ENTRY'),
            sshUserPrivateKey(
              credentialsId: 'deploy-ssh-key',
              keyFileVariable: 'SSH_KEY_FILE'
            )
          ]) {
            sh '''
              mkdir -p ~/.ssh
              chmod 700 ~/.ssh
              echo "$KNOWN_HOSTS_ENTRY" > ~/.ssh/known_hosts
              chmod 600 ~/.ssh/known_hosts

              ssh -i "$SSH_KEY_FILE" \
                  -o StrictHostKeyChecking=yes \
                  -o BatchMode=yes \
                  "$DEPLOY_USER@$DEPLOY_HOST" \
                "cd /srv/crewly
                 if [ -f .env.prev ]; then
                   echo 'Rolling back to previous deployment...'
                   cat .env.production .env.prev > .env.deploy
                   docker compose -f docker-compose.prod.yml --env-file .env.deploy \
                     up -d --no-build --remove-orphans
                   rm -f .env.deploy .env.image
                   echo 'Rollback complete'
                 else
                   echo 'WARNING: No .env.prev found — cannot auto-rollback (first deploy?)'
                 fi"
            '''
          }
        }
        echo "Pipeline FAILED — ${env.BUILD_URL}"
      }
    }
    always {
      sh 'docker logout "$REGISTRY" || true'
      cleanWs()
    }
  }
}
