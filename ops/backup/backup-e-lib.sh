#!/bin/sh
set -eu

umask 077
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

APP_DIR="${APP_DIR:-/home/atm/apps/e-lib-react}"
BACKUP_ROOT="${BACKUP_ROOT:-/home/atm/apps/backups/e-lib-react}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
LOGICAL_RETENTION_DAYS="${LOGICAL_RETENTION_DAYS:-30}"
SNAPSHOT_RETENTION_DAYS="${SNAPSHOT_RETENTION_DAYS:-30}"
BASE_RETENTION_DAYS="${BASE_RETENTION_DAYS:-7}"
WAL_RETENTION_DAYS="${WAL_RETENTION_DAYS:-8}"

case "$BACKUP_ROOT" in
  /home/atm/apps/backups/e-lib-react) ;;
  *)
    echo "Refusing unexpected BACKUP_ROOT: $BACKUP_ROOT" >&2
    exit 1
    ;;
esac

cd "$APP_DIR"
mkdir -p \
  "$BACKUP_ROOT/logical" \
  "$BACKUP_ROOT/uploads-snapshots" \
  "$BACKUP_ROOT/pitr/base" \
  "$BACKUP_ROOT/pitr/wal"

exec 9>"$BACKUP_ROOT/.backup.lock"
if ! flock -n 9; then
  echo "Another e-lib backup is already running"
  exit 0
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
logical_partial="$BACKUP_ROOT/logical/elib-$stamp.dump.partial"
logical_final="$BACKUP_ROOT/logical/elib-$stamp.dump"
snapshot_root="$BACKUP_ROOT/uploads-snapshots"
snapshot_partial="$snapshot_root/.partial-$stamp"
snapshot_final="$snapshot_root/$stamp"
base_dir="/backups/pitr/base/$stamp"

cleanup_partial() {
  rm -f -- "$logical_partial"
  if [ -d "$snapshot_partial" ]; then
    rm -rf -- "$snapshot_partial"
  fi
}
trap cleanup_partial EXIT HUP INT TERM

echo "[$(date --iso-8601=seconds)] logical PostgreSQL backup"
docker compose -f "$COMPOSE_FILE" exec -T db \
  sh -eu -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "$logical_partial"
docker compose -f "$COMPOSE_FILE" exec -T db pg_restore --list < "$logical_partial" > /dev/null
mv -- "$logical_partial" "$logical_final"
sha256sum "$logical_final" > "$logical_final.sha256"

echo "[$(date --iso-8601=seconds)] uploads snapshot"
previous_target=""
if [ -L "$snapshot_root/current" ]; then
  previous_target="$(readlink -f "$snapshot_root/current" || true)"
fi
mkdir -p "$snapshot_partial"
if [ -n "$previous_target" ] && [ -d "$previous_target" ]; then
  rsync -a --delete --link-dest="$previous_target" "$APP_DIR/uploads/" "$snapshot_partial/"
else
  rsync -a --delete "$APP_DIR/uploads/" "$snapshot_partial/"
fi
mv -- "$snapshot_partial" "$snapshot_final"
ln -s "$stamp" "$snapshot_root/.current-$stamp"
mv -Tf "$snapshot_root/.current-$stamp" "$snapshot_root/current"

echo "[$(date --iso-8601=seconds)] PostgreSQL PITR base backup"
docker compose -f "$COMPOSE_FILE" exec -T --user postgres db sh -eu -c \
  "mkdir -p '$base_dir' && pg_basebackup -h /var/run/postgresql -U \"\$POSTGRES_USER\" -D '$base_dir' -Ft -z -X stream -c fast"
docker compose -f "$COMPOSE_FILE" exec -T db sh -eu -c \
  "tar -tzf '$base_dir/base.tar.gz' >/dev/null && tar -tzf '$base_dir/pg_wal.tar.gz' >/dev/null"
docker compose -f "$COMPOSE_FILE" exec -T db \
  sh -eu -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select pg_switch_wal();"' > /dev/null

echo "[$(date --iso-8601=seconds)] retention cleanup"
find "$BACKUP_ROOT/logical" -maxdepth 1 -type f -mtime "+$LOGICAL_RETENTION_DAYS" -delete
find "$snapshot_root" -mindepth 1 -maxdepth 1 -type d -mtime "+$SNAPSHOT_RETENTION_DAYS" -exec rm -rf -- {} +
find "$BACKUP_ROOT/pitr/base" -mindepth 1 -maxdepth 1 -type d -mtime "+$BASE_RETENTION_DAYS" -exec rm -rf -- {} +
find "$BACKUP_ROOT/pitr/wal" -maxdepth 1 -type f -mtime "+$WAL_RETENTION_DAYS" -delete

trap - EXIT HUP INT TERM
echo "[$(date --iso-8601=seconds)] backup completed: $stamp"
