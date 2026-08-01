exports.up = async function (knex) {
  for (const tableName of ["file_items", "file_versions", "file_version_assets"]) {
    await knex.schema.table(tableName, (table) => {
      table.timestamp("purged_at");
      table.integer("purged_by").references("id").inTable("users").onDelete("SET NULL");
      table.index(["purged_at"], `${tableName}_purged_at_index`);
    });
  }
};

exports.down = async function (knex) {
  for (const tableName of ["file_version_assets", "file_versions", "file_items"]) {
    await knex.schema.table(tableName, (table) => {
      table.dropIndex(["purged_at"], `${tableName}_purged_at_index`);
      table.dropColumn("purged_by");
      table.dropColumn("purged_at");
    });
  }
};
