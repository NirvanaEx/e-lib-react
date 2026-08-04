exports.up = async function (knex) {
  await knex.schema.createTable("guides", (table) => {
    table.increments("id").primary();
    // "user" — инструкция пользовательской части, "admin" — панели
    table.string("key").notNullable().unique();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("guide_blocks", (table) => {
    table.increments("id").primary();
    table.integer("guide_id").references("id").inTable("guides").onDelete("CASCADE");
    table.integer("sort_order").notNullable().defaultTo(0);
    // "builtin/<файл>" — картинка из поставки, "uploads/<файл>" — загруженная
    table.string("image").nullable();
    table.timestamps(true, true);
    table.index(["guide_id", "sort_order"], "guide_blocks_order_idx");
  });

  await knex.schema.createTable("guide_block_translations", (table) => {
    table.increments("id").primary();
    table.integer("block_id").references("id").inTable("guide_blocks").onDelete("CASCADE");
    table.string("lang").notNullable();
    table.string("title", 500).notNullable().defaultTo("");
    table.text("body").notNullable().defaultTo("");
    table.unique(["block_id", "lang"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("guide_block_translations");
  await knex.schema.dropTableIfExists("guide_blocks");
  await knex.schema.dropTableIfExists("guides");
};
