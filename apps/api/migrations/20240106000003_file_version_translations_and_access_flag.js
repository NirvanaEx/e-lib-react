exports.up = async function (knex) {
  await knex.schema.table("file_items", (table) => {
    table.boolean("allow_version_access").notNullable().defaultTo(true);
  });

  await knex.schema.createTable("file_version_translations", (table) => {
    table.increments("id").primary();
    table.integer("file_version_id").references("id").inTable("file_versions").onDelete("CASCADE");
    table.string("lang").notNullable();
    table.string("title").notNullable();
    table.text("description");
    table.unique(["file_version_id", "lang"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("file_version_translations");
  await knex.schema.table("file_items", (table) => {
    table.dropColumn("allow_version_access");
  });
};
