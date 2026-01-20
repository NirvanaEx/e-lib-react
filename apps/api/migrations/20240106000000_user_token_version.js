exports.up = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.integer("token_version").notNullable().defaultTo(0);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("token_version");
  });
};
