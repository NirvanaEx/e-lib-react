exports.up = async function (knex) {
  await knex.schema.createTable("permissions", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable().unique();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("role_permissions", (table) => {
    table
      .integer("role_id")
      .notNullable()
      .references("id")
      .inTable("roles")
      .onDelete("CASCADE");
    table
      .integer("permission_id")
      .notNullable()
      .references("id")
      .inTable("permissions")
      .onDelete("CASCADE");
    table.primary(["role_id", "permission_id"]);
  });

  await knex.schema.raw("CREATE INDEX role_permissions_role_idx ON role_permissions (role_id);");
  await knex.schema.raw("CREATE INDEX role_permissions_permission_idx ON role_permissions (permission_id);");
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("role_permissions");
  await knex.schema.dropTableIfExists("permissions");
};
