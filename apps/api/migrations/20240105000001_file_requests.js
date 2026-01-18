exports.up = async function (knex) {
  await knex.schema.createTable("file_requests", (table) => {
    table.increments("id").primary();
    table.integer("section_id").references("id").inTable("sections").onDelete("SET NULL");
    table.integer("category_id").references("id").inTable("categories").onDelete("SET NULL");
    table.string("access_type").notNullable();
    table.string("status").notNullable().defaultTo("pending");
    table.text("comment");
    table.integer("created_by").references("id").inTable("users").onDelete("SET NULL");
    table.integer("resolved_by").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("resolved_at");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("file_request_translations", (table) => {
    table.increments("id").primary();
    table.integer("file_request_id").references("id").inTable("file_requests").onDelete("CASCADE");
    table.string("lang").notNullable();
    table.string("title").notNullable();
    table.text("description");
    table.unique(["file_request_id", "lang"]);
  });

  await knex.schema.createTable("file_request_assets", (table) => {
    table.increments("id").primary();
    table.integer("file_request_id").references("id").inTable("file_requests").onDelete("CASCADE");
    table.string("lang").notNullable();
    table.string("original_name").notNullable();
    table.string("mime").notNullable();
    table.bigInteger("size").notNullable();
    table.string("path").notNullable();
    table.string("checksum");
    table.timestamps(true, true);
    table.unique(["file_request_id", "lang"]);
  });

  await knex.schema.createTable("file_request_access_departments", (table) => {
    table.integer("file_request_id").references("id").inTable("file_requests").onDelete("CASCADE");
    table.integer("department_id").references("id").inTable("departments").onDelete("CASCADE");
    table.primary(["file_request_id", "department_id"]);
  });

  await knex.schema.createTable("file_request_access_users", (table) => {
    table.integer("file_request_id").references("id").inTable("file_requests").onDelete("CASCADE");
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.primary(["file_request_id", "user_id"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("file_request_access_users");
  await knex.schema.dropTableIfExists("file_request_access_departments");
  await knex.schema.dropTableIfExists("file_request_assets");
  await knex.schema.dropTableIfExists("file_request_translations");
  await knex.schema.dropTableIfExists("file_requests");
};
