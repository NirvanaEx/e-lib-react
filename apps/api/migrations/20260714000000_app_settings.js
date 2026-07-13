exports.up = async function (knex) {
  await knex.schema.createTable("app_settings", (table) => {
    table.string("key").primary();
    table.text("value");
    table.timestamps(true, true);
  });

  await knex("app_settings").insert({
    key: "test_ribbon_enabled",
    value: "true",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("app_settings");
};
