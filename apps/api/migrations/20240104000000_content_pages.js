exports.up = async function (knex) {
  await knex.schema.createTable("content_pages", (table) => {
    table.increments("id").primary();
    table.string("key").notNullable().unique();
    table.boolean("requires_acceptance").notNullable().defaultTo(false);
    table.string("display_mode").notNullable().defaultTo("once");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("content_page_translations", (table) => {
    table.increments("id").primary();
    table.integer("page_id").references("id").inTable("content_pages").onDelete("CASCADE");
    table.string("lang").notNullable();
    table.string("title").notNullable();
    table.text("body").notNullable();
    table.unique(["page_id", "lang"]);
  });

  await knex.schema.createTable("content_page_acceptances", (table) => {
    table.integer("page_id").references("id").inTable("content_pages").onDelete("CASCADE");
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.timestamp("accepted_at").defaultTo(knex.fn.now());
    table.primary(["page_id", "user_id"]);
  });

  await knex("content_pages").insert({
    key: "user_agreement",
    requires_acceptance: true,
    display_mode: "once",
    is_active: true,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("content_page_acceptances");
  await knex.schema.dropTableIfExists("content_page_translations");
  await knex.schema.dropTableIfExists("content_pages");
};
