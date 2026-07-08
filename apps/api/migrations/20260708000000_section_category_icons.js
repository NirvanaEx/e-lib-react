exports.up = async function (knex) {
  await knex.schema.alterTable("sections", (table) => {
    table.string("icon", 64).nullable();
    table.string("icon_color", 16).nullable();
  });
  await knex.schema.alterTable("categories", (table) => {
    table.string("icon", 64).nullable();
    table.string("icon_color", 16).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("sections", (table) => {
    table.dropColumn("icon");
    table.dropColumn("icon_color");
  });
  await knex.schema.alterTable("categories", (table) => {
    table.dropColumn("icon");
    table.dropColumn("icon_color");
  });
};
