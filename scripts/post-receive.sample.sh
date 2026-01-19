#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/srv/git/e-lib.git"
APP_DIR="/srv/apps/e-lib"
CHECKOUT_DIR="${APP_DIR}"

if [ ! -d "${CHECKOUT_DIR}" ]; then
  mkdir -p "${CHECKOUT_DIR}"
fi

GIT_WORK_TREE="${CHECKOUT_DIR}" git --git-dir="${REPO_DIR}" checkout -f

# Ensure persistent dirs/files exist
mkdir -p "${APP_DIR}/uploads"
if [ ! -f "${APP_DIR}/.env" ]; then
  echo "Missing ${APP_DIR}/.env" >&2
  exit 1
fi

cd "${CHECKOUT_DIR}"

# Build and run
/usr/bin/docker compose -f docker-compose.prod.yml build
/usr/bin/docker compose -f docker-compose.prod.yml up -d --remove-orphans
