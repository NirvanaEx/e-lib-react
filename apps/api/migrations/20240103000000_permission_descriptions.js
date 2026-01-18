exports.up = async function (knex) {
  await knex.schema.alterTable("permissions", (table) => {
    table.string("description_en");
    table.string("description_ru");
    table.string("description_uz");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("permissions", (table) => {
    table.dropColumn("description_en");
    table.dropColumn("description_ru");
    table.dropColumn("description_uz");
  });
};
