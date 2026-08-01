\set ON_ERROR_STOP on

-- Usage:
--   psql ... --set=file_id=123 --file=restore-protected-document.sql
--
-- This operation intentionally requires database/server access. The web
-- application cannot restore or destroy an item after it reaches the protected
-- recovery archive.

BEGIN;

SELECT id, deleted_at, purged_at
FROM file_items
WHERE id = :file_id
FOR UPDATE;

UPDATE file_items
SET deleted_at = NULL,
    purged_at = NULL,
    purged_by = NULL,
    updated_at = now()
WHERE id = :file_id
  AND purged_at IS NOT NULL;

UPDATE file_versions
SET purged_at = NULL,
    purged_by = NULL
WHERE file_item_id = :file_id;

UPDATE file_version_assets
SET purged_at = NULL,
    purged_by = NULL
WHERE file_version_id IN (
  SELECT id FROM file_versions WHERE file_item_id = :file_id
);

COMMIT;
