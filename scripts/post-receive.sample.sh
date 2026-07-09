#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/srv/git/e-lib.git"
APP_DIR="/srv/apps/e-lib"
CHECKOUT_DIR="${APP_DIR}"
COMPOSE="/usr/bin/docker compose -f docker-compose.prod.yml"

# 1. Выкладываем запушенный код в рабочую папку
if [ ! -d "${CHECKOUT_DIR}" ]; then
  mkdir -p "${CHECKOUT_DIR}"
fi
GIT_WORK_TREE="${CHECKOUT_DIR}" git --git-dir="${REPO_DIR}" checkout -f

# 2. Гарантируем наличие постоянных папок/файлов
mkdir -p "${APP_DIR}/uploads"
if [ ! -f "${APP_DIR}/.env" ]; then
  echo "Missing ${APP_DIR}/.env" >&2
  exit 1
fi

cd "${CHECKOUT_DIR}"

# Подхватываем переменные окружения (DB_USER/DB_NAME/…), чтобы достучаться до Postgres.
# Через process substitution + tr срезаем возможные CRLF: иначе строки с \r
# ломают source ("$'\r': command not found") и портят значения (DB_HOST=db␍).
set -a
. <(tr -d '\r' < "${APP_DIR}/.env")
set +a
DB_USER="${DB_USER:-elib}"
DB_NAME="${DB_NAME:-elib}"

# 3. Сборка образов
${COMPOSE} build

# 4. Поднимаем БД и ждём, пока Postgres реально начнёт принимать соединения
${COMPOSE} up -d db
echo "Waiting for Postgres to become ready..."
for i in $(seq 1 30); do
  if ${COMPOSE} exec -T db pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
    break
  fi
  if [ "${i}" -eq 30 ]; then
    echo "Postgres did not become ready in time" >&2
    exit 1
  fi
  sleep 2
done

# 5. Прогоняем миграции в одноразовом api-контейнере.
#    Образ уже содержит knex/pg/dotenv в node_modules — монтируем только
#    свежий knexfile и папку migrations из выложенного кода.
${COMPOSE} run --rm --no-deps \
  -v "${CHECKOUT_DIR}/apps/api/knexfile.js:/app/knexfile.js:ro" \
  -v "${CHECKOUT_DIR}/apps/api/migrations:/app/migrations:ro" \
  api npm run migrate

# 6. Поднимаем/пересоздаём весь стек уже с новыми образами и применённой схемой
${COMPOSE} up -d --remove-orphans
