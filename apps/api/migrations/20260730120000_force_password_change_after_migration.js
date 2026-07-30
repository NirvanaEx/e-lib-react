// Пользователи перенесены из старого e-lib: пароли им проставили при импорте,
// сами они их не выбирали. Механика принудительной смены в приложении уже есть
// (must_change_password + TempPasswordGuard + страница /change-temp-password),
// не хватало только поднять флаг перенесённым учётным записям — после этого
// первый же вход упирается в форму «задайте новый пароль», а остальное API
// закрыто до смены.
//
// Суперадмина не трогаем: иначе администратор потеряет доступ к панели ровно в
// момент деплоя, до того как успеет что-то сделать.
exports.up = async function (knex) {
  const superadminRole = await knex("roles").where({ name: "superadmin" }).first("id");

  const query = knex("users").whereNull("deleted_at").where({ must_change_password: false });
  if (superadminRole?.id) {
    query.whereNot({ role_id: superadminRole.id });
  }

  await query.update({ must_change_password: true });
};

// Обратной операции нет: до миграции флаг у всех был false, но восстанавливать
// его «всем подряд» нельзя — часть пользователей к этому моменту уже сменит
// пароль сама, и сброс флага вернул бы им статус «пароль временный».
exports.down = async function () {
  return Promise.resolve();
};
