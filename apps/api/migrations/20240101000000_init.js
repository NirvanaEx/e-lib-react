exports.up = async function (knex) {
  await knex.schema.createTable("roles", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable().unique();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("departments", (table) => {
    table.increments("id").primary();
    table.integer("parent_id").nullable().references("id").inTable("departments").onDelete("SET NULL");
    table.integer("depth").notNullable().defaultTo(1);
    table.string("name").notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("login").notNullable();
    table.string("password_hash").notNullable();
    table.string("surname").notNullable();
    table.string("name").notNullable();
    table.string("patronymic");
    table.integer("role_id").references("id").inTable("roles").onDelete("RESTRICT");
    table.integer("department_id").references("id").inTable("departments").onDelete("SET NULL");
    table.boolean("must_change_password").notNullable().defaultTo(true);
    table.string("lang").notNullable().defaultTo("ru");
    table.timestamp("deleted_at");
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE UNIQUE INDEX users_login_active_unique ON users (login) WHERE deleted_at IS NULL;"
  );

  await knex.schema.createTable("sessions", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("ip");
    table.string("user_agent");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("sections", (table) => {
    table.increments("id").primary();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("sections_translations", (table) => {
    table.increments("id").primary();
    table.integer("section_id").references("id").inTable("sections").onDelete("CASCADE");
    table.string("lang").notNullable();
    table.string("title").notNullable();
    table.unique(["section_id", "lang"]);
  });

  await knex.schema.createTable("categories", (table) => {
    table.increments("id").primary();
    table.integer("section_id").references("id").inTable("sections").onDelete("CASCADE");
    table.integer("parent_id").nullable().references("id").inTable("categories").onDelete("SET NULL");
    table.integer("depth").notNullable().defaultTo(1);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("categories_translations", (table) => {
    table.increments("id").primary();
    table.integer("category_id").references("id").inTable("categories").onDelete("CASCADE");
    table.string("lang").notNullable();
    table.string("title").notNullable();
    table.unique(["category_id", "lang"]);
  });

  await knex.schema.createTable("file_items", (table) => {
    table.increments("id").primary();
    table.integer("section_id").references("id").inTable("sections").onDelete("SET NULL");
    table.integer("category_id").references("id").inTable("categories").onDelete("SET NULL");
    table.string("access_type").notNullable();
    table.integer("current_version_id");
    table.integer("created_by").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("deleted_at");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("file_translations", (table) => {
    table.increments("id").primary();
    table.integer("file_item_id").references("id").inTable("file_items").onDelete("CASCADE");
    table.string("lang").notNullable();
    table.string("title").notNullable();
    table.text("description");
    table.unique(["file_item_id", "lang"]);
  });

  await knex.schema.createTable("file_versions", (table) => {
    table.increments("id").primary();
    table.integer("file_item_id").references("id").inTable("file_items").onDelete("CASCADE");
    table.integer("version_number").notNullable();
    table.string("comment");
    table.integer("created_by").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("deleted_at");
    table.timestamps(true, true);
    table.unique(["file_item_id", "version_number"]);
  });

  await knex.schema.createTable("file_version_assets", (table) => {
    table.increments("id").primary();
    table.integer("file_version_id").references("id").inTable("file_versions").onDelete("CASCADE");
    table.string("lang").notNullable();
    table.string("original_name").notNullable();
    table.string("mime").notNullable();
    table.bigInteger("size").notNullable();
    table.string("path").notNullable();
    table.string("checksum");
    table.timestamps(true, true);
    table.unique(["file_version_id", "lang"]);
  });

  await knex.schema.createTable("file_access_departments", (table) => {
    table.integer("file_item_id").references("id").inTable("file_items").onDelete("CASCADE");
    table.integer("department_id").references("id").inTable("departments").onDelete("CASCADE");
    table.primary(["file_item_id", "department_id"]);
  });

  await knex.schema.createTable("file_access_users", (table) => {
    table.integer("file_item_id").references("id").inTable("file_items").onDelete("CASCADE");
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.primary(["file_item_id", "user_id"]);
  });

  await knex.schema.createTable("downloads", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("SET NULL");
    table.integer("file_item_id").references("id").inTable("file_items").onDelete("SET NULL");
    table.integer("file_version_id").references("id").inTable("file_versions").onDelete("SET NULL");
    table.integer("file_version_asset_id").references("id").inTable("file_version_assets").onDelete("SET NULL");
    table.string("lang").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("audit_logs", (table) => {
    table.increments("id").primary();
    table.integer("actor_user_id").references("id").inTable("users").onDelete("SET NULL");
    table.string("action").notNullable();
    table.string("entity_type").notNullable();
    table.integer("entity_id").notNullable();
    table.jsonb("diff");
    table.jsonb("meta");
    table.string("ip");
    table.string("user_agent");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.raw("CREATE INDEX departments_parent_idx ON departments (parent_id);");
  await knex.schema.raw("CREATE INDEX departments_depth_idx ON departments (depth);");
  await knex.schema.raw("CREATE INDEX categories_parent_idx ON categories (parent_id);");
  await knex.schema.raw("CREATE INDEX categories_depth_idx ON categories (depth);");
  await knex.schema.raw("CREATE INDEX downloads_created_at_idx ON downloads (created_at);");
  await knex.schema.raw("CREATE INDEX downloads_file_item_idx ON downloads (file_item_id);");
  await knex.schema.raw("CREATE INDEX downloads_user_idx ON downloads (user_id);");
  await knex.schema.raw("CREATE INDEX audit_created_at_idx ON audit_logs (created_at);");
  await knex.schema.raw("CREATE INDEX audit_actor_idx ON audit_logs (actor_user_id);");
  await knex.schema.raw("CREATE INDEX audit_entity_idx ON audit_logs (entity_type, entity_id);");
  await knex.schema.raw("CREATE INDEX audit_action_idx ON audit_logs (action);");
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("audit_logs");
  await knex.schema.dropTableIfExists("downloads");
  await knex.schema.dropTableIfExists("file_access_users");
  await knex.schema.dropTableIfExists("file_access_departments");
  await knex.schema.dropTableIfExists("file_version_assets");
  await knex.schema.dropTableIfExists("file_versions");
  await knex.schema.dropTableIfExists("file_translations");
  await knex.schema.dropTableIfExists("file_items");
  await knex.schema.dropTableIfExists("categories_translations");
  await knex.schema.dropTableIfExists("categories");
  await knex.schema.dropTableIfExists("sections_translations");
  await knex.schema.dropTableIfExists("sections");
  await knex.schema.dropTableIfExists("sessions");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("departments");
  await knex.schema.dropTableIfExists("roles");
};
