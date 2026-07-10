// Repairs original_name values stored before uploads decoded the multipart filename as UTF-8.
// Only the display/download name is rewritten; `path` still points at the file on disk.
const TABLES = ["file_version_assets", "file_request_assets"];

function decodeUploadFilename(name) {
  if (!name) return name;
  if (/[^ -ÿ]/.test(name)) return name;
  const bytes = Buffer.from(name, "latin1");
  const decoded = bytes.toString("utf8");
  return Buffer.from(decoded, "utf8").equals(bytes) ? decoded : name;
}

exports.up = async function (knex) {
  for (const table of TABLES) {
    const rows = await knex(table).select("id", "original_name");
    for (const row of rows) {
      const fixed = decodeUploadFilename(row.original_name);
      if (fixed !== row.original_name) {
        await knex(table).where({ id: row.id }).update({ original_name: fixed });
      }
    }
  }
};

exports.down = async function () {
  // Data repair: re-introducing the mojibake would be a regression, so this is intentionally a no-op.
};
