#!/usr/bin/env bash
#
# Runs ON THE SERVER. The GitHub Actions deploy job copies this file and
# docker-compose.yml to ~/sms/ and then runs:
#
#   BACKEND_IMAGE=ghcr.io/<owner>/sms-backend \
#   FRONTEND_IMAGE=ghcr.io/<owner>/sms-frontend \
#   bash ~/sms/deploy.sh <commit-sha>
#
# Steps:
#   1. Remember the tag that is running now (IMAGE_TAG in .env).
#   2. Pull the new images and restart the containers with the new tag.
#   3. curl /api/health until it answers 200 (max ~60 seconds).
#   4. If the health check fails, switch back to the previous tag and exit 1
#      so the pipeline is marked as failed.
#
set -euo pipefail

NEW_TAG="${1:?Usage: deploy.sh <image-tag>}"
: "${BACKEND_IMAGE:?BACKEND_IMAGE must be set}"
: "${FRONTEND_IMAGE:?FRONTEND_IMAGE must be set}"

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "ERROR: $(pwd)/.env not found. Create it once on the server (see docs/CI_CD_SETUP.md)."
  exit 1
fi

# Read a value from .env (empty if missing).
get_env() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- || true
}

# Set a value in .env, adding the line if it doesn't exist yet.
set_env() {
  if grep -qE "^$1=" .env; then
    sed -i "s|^$1=.*|$1=$2|" .env
  else
    echo "$1=$2" >> .env
  fi
}

HEALTH_URL="http://localhost:$(get_env HTTP_PORT | grep . || echo 80)/api/health"

# Start the stack with the given image tag.
# The tag is stored in .env so manual `docker compose` commands use it too.
start_version() {
  set_env IMAGE_TAG "$1"
  docker compose pull backend frontend &&
    docker compose up -d --no-build --remove-orphans
}

# Try the health endpoint 12 times, 5 seconds apart.
health_check() {
  for attempt in $(seq 1 12); do
    if curl -fsS --max-time 5 "$HEALTH_URL"; then
      echo
      return 0
    fi
    echo "Health check attempt $attempt/12 failed, retrying in 5s..."
    sleep 5
  done
  return 1
}

PREVIOUS_TAG="$(get_env IMAGE_TAG)"
set_env BACKEND_IMAGE "$BACKEND_IMAGE"
set_env FRONTEND_IMAGE "$FRONTEND_IMAGE"

echo "==> Deploying tag $NEW_TAG (currently running: ${PREVIOUS_TAG:-nothing})"
if start_version "$NEW_TAG" && health_check; then
  echo "==> Deployment of $NEW_TAG is healthy"
  docker image prune -f > /dev/null # remove dangling images
  exit 0
fi

echo "==> Health check FAILED for $NEW_TAG"
docker compose ps
docker compose logs --tail=30 backend || true

if [[ -z "$PREVIOUS_TAG" || "$PREVIOUS_TAG" == "$NEW_TAG" ]]; then
  echo "==> No previous version to roll back to"
  exit 1
fi

echo "==> Rolling back to $PREVIOUS_TAG"
if start_version "$PREVIOUS_TAG" && health_check; then
  echo "==> Rollback to $PREVIOUS_TAG succeeded; the old version is serving traffic"
else
  echo "==> Rollback to $PREVIOUS_TAG is ALSO unhealthy - manual action needed"
fi
exit 1 # the deployment itself failed, so the pipeline must show red
