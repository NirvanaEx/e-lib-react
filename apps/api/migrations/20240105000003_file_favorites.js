exports.up = async function (knex) {
  await knex.schema.createTable("file_favorites", (table) => {
    table.integer("file_item_id").references("id").inTable("file_items").onDelete("CASCADE");
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.primary(["file_item_id", "user_id"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("file_favorites");
};
