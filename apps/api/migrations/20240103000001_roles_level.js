exports.up = async function (knex) {
  await knex.schema.alterTable("roles", (table) => {
    table.integer("level").notNullable().defaultTo(1);
  });

  await knex("roles").where({ name: "superadmin" }).update({ level: 100 });
  await knex("roles").where({ name: "admin" }).update({ level: 80 });
  await knex("roles").where({ name: "manager" }).update({ level: 50 });
  await knex("roles").where({ name: "user" }).update({ level: 10 });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("roles", (table) => {
    table.dropColumn("level");
  });
};
