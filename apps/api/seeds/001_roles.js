exports.seed = async function (knex) {
  await knex("roles")
    .insert([
      { name: "superadmin", level: 100 },
      { name: "admin", level: 80 },
      { name: "manager", level: 50 },
      { name: "user", level: 10 }
    ])
    .onConflict("name")
    .merge();
};
