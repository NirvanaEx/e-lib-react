// Activity tracking for the dashboard statistics: file views alongside
// downloads, request metadata (ip/user agent) on both, and a login attempt
// log that also backs the brute-force lockout in AuthService.
exports.up = async function (knex) {
  await knex.schema.createTable("file_views", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("SET NULL");
    table.integer("file_item_id").references("id").inTable("file_items").onDelete("CASCADE");
    table.integer("file_version_id").references("id").inTable("file_versions").onDelete("SET NULL");
    table.string("lang");
    // Where the view came from: "details" (file card) or "viewer" (reader).
    table.string("source").notNullable().defaultTo("details");
    table.string("ip");
    table.string("user_agent");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.raw("CREATE INDEX file_views_created_at_idx ON file_views (created_at);");
  await knex.schema.raw("CREATE INDEX file_views_file_item_idx ON file_views (file_item_id);");
  await knex.schema.raw("CREATE INDEX file_views_user_idx ON file_views (user_id);");
  await knex.schema.raw("CREATE INDEX file_views_user_file_idx ON file_views (user_id, file_item_id, created_at);");

  await knex.schema.alterTable("downloads", (table) => {
    table.string("ip");
    table.string("user_agent");
  });

  await knex.schema.createTable("login_attempts", (table) => {
    table.increments("id").primary();
    table.string("login").notNullable();
    table.integer("user_id").references("id").inTable("users").onDelete("SET NULL");
    table.boolean("success").notNullable().defaultTo(false);
    // "invalid_password" | "unknown_login" | "locked" | null on success.
    table.string("reason");
    table.string("ip");
    table.string("user_agent");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.raw("CREATE INDEX login_attempts_created_at_idx ON login_attempts (created_at);");
  await knex.schema.raw("CREATE INDEX login_attempts_login_idx ON login_attempts (lower(login), created_at);");
  await knex.schema.raw("CREATE INDEX login_attempts_ip_idx ON login_attempts (ip, created_at);");
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("login_attempts");
  await knex.schema.alterTable("downloads", (table) => {
    table.dropColumn("ip");
    table.dropColumn("user_agent");
  });
  await knex.schema.dropTableIfExists("file_views");
};
