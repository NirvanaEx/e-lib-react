exports.seed = async function (knex) {
  await knex("roles")
    .insert([
      { name: "superadmin" },
      { name: "admin" },
      { name: "manager" },
      { name: "user" }
    ])
    .onConflict("name")
    .merge();
};
