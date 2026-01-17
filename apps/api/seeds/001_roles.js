exports.seed = async function (knex) {
  await knex("roles").del();
  await knex("roles").insert([
    { name: "superadmin" },
    { name: "admin" },
    { name: "manager" },
    { name: "user" }
  ]);
};
