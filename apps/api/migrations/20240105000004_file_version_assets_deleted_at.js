exports.up = async function (knex) {
  await knex.schema.table("file_version_assets", (table) => {
    table.timestamp("deleted_at");
  });
};

exports.down = async function (knex) {
  await knex.schema.table("file_version_assets", (table) => {
    table.dropColumn("deleted_at");
  });
};
