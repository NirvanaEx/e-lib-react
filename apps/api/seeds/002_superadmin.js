const bcrypt = require("bcrypt");

exports.seed = async function (knex) {
  const role = await knex("roles").where({ name: "superadmin" }).first();
  if (!role) {
    throw new Error("superadmin role not found, run roles seed first");
  }

  const passwordHash = await bcrypt.hash("123", 10);

  await knex("users").where({ login: "superadmin" }).del();
  await knex("users").insert({
    login: "superadmin",
    password_hash: passwordHash,
    surname: "Super",
    name: "Admin",
    patronymic: null,
    role_id: role.id,
    department_id: null,
    must_change_password: false,
    lang: "ru",
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });
};
