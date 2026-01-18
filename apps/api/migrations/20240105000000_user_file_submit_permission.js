exports.up = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.boolean("can_submit_files").notNullable().defaultTo(false);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("can_submit_files");
  });
};
