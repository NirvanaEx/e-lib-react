exports.up = async function (knex) {
  await knex.schema.alterTable("file_requests", (table) => {
    table.string("request_type").notNullable().defaultTo("new");
    table.integer("file_item_id").references("id").inTable("file_items").onDelete("SET NULL");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("file_requests", (table) => {
    table.dropColumn("file_item_id");
    table.dropColumn("request_type");
  });
};
