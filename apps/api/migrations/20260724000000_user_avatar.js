exports.up = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.string("avatar").nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("avatar");
  });
};
