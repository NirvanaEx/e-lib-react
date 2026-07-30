# e-lib backup and recovery

The production server keeps three independent recovery layers:

1. Application deletions from trash are moved to a protected archive. Rows and
   uploaded files are not physically deleted.
2. A daily logical PostgreSQL dump and an rsync hard-link snapshot of `uploads`
   are kept for 30 days.
3. PostgreSQL base backups are kept for 7 days and archived WAL for 8 days,
   providing point-in-time recovery (PITR) for approximately the last 7 days.

The backup directory must not be mounted into the API container. This prevents a
compromised web account from deleting backups.

Production merges the database settings from `docker-compose.pitr.yml` into the
server compose file and runs `backup-e-lib.sh` every day at 02:15 Asia/Tashkent.
The cron job writes to
`/home/atm/apps/backups/e-lib-react/backup.log`.

## Restore a document removed from trash

Run `restore-protected-document.sql` with the numeric document ID from the audit
log. Always take a fresh logical dump first:

```sh
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom > before-recovery.dump

docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "$DB_USER" -d "$DB_NAME" --set=file_id=123 \
  < ops/backup/restore-protected-document.sql
```

## PITR

Never perform PITR directly over the live database. Stop writes, preserve the
current Docker volume, and restore the most recent base backup into a new volume.
Create `recovery.signal` and configure:

```conf
restore_command = 'cp /backups/pitr/wal/%f %p'
recovery_target_time = '2026-07-30 05:15:00+00'
recovery_target_action = 'promote'
```

Start the restored volume on an isolated PostgreSQL container, verify the target
data, and only then switch the application to it.
