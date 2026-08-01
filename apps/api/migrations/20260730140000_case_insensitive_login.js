// Вход теперь сравнивает логин без учёта регистра, поэтому уникальность тоже
// должна быть регистронезависимой: иначе рядом с "Ivanov" можно создать
// "ivanov", и запрос по lower(login) вернёт произвольную из двух записей.
// Прежний индекс по самому login после этого избыточен — он строго слабее.
exports.up = async function (knex) {
  await knex.raw(
    `CREATE UNIQUE INDEX users_login_lower_active_unique
       ON users (lower(login))
       WHERE deleted_at IS NULL`
  );
  await knex.raw("DROP INDEX IF EXISTS users_login_active_unique");
};

exports.down = async function (knex) {
  await knex.raw(
    `CREATE UNIQUE INDEX users_login_active_unique
       ON users (login)
       WHERE deleted_at IS NULL`
  );
  await knex.raw("DROP INDEX IF EXISTS users_login_lower_active_unique");
};
