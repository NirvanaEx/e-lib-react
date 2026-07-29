// Справочник должностей: в старой библиотеке должность лежала свободным
// текстом в карточке пользователя, из-за чего одни и те же названия
// расходились по регистру и формулировкам. Здесь это отдельная таблица,
// а users.position_id ссылается на неё.
const permissions = {
  "position.read": {
    en: "View positions",
    ru: "Просмотр должностей",
    uz: "Lavozimlarni ko'rish"
  },
  "position.add": {
    en: "Create positions",
    ru: "Создание должностей",
    uz: "Lavozimlarni yaratish"
  },
  "position.update": {
    en: "Update positions",
    ru: "Изменение должностей",
    uz: "Lavozimlarni yangilash"
  },
  "position.delete": {
    en: "Delete positions",
    ru: "Удаление должностей",
    uz: "Lavozimlarni o'chirish"
  }
};

exports.up = async function (knex) {
  await knex.schema.createTable("positions", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.timestamps(true, true);
  });

  // Названия должностей уникальны без учёта регистра: иначе «инженер» и
  // «Инженер» снова разъедутся, как в старой базе.
  await knex.schema.raw("CREATE UNIQUE INDEX positions_name_unique ON positions (lower(name));");

  await knex.schema.alterTable("users", (table) => {
    table.integer("position_id").references("id").inTable("positions").onDelete("SET NULL");
  });

  const names = Object.keys(permissions);
  await knex("permissions")
    .insert(
      names.map((name) => ({
        name,
        description_en: permissions[name].en,
        description_ru: permissions[name].ru,
        description_uz: permissions[name].uz
      }))
    )
    .onConflict("name")
    .ignore();

  // Права справочников держат админы, поэтому раздаём так же, как department.*
  const roles = await knex("roles").select("id", "name").whereIn("name", ["superadmin", "admin"]);
  const permissionRows = await knex("permissions").select("id").whereIn("name", names);
  const rows = [];
  for (const role of roles) {
    for (const permission of permissionRows) {
      rows.push({ role_id: role.id, permission_id: permission.id });
    }
  }
  if (rows.length > 0) {
    await knex("role_permissions").insert(rows).onConflict(["role_id", "permission_id"]).ignore();
  }
};

exports.down = async function (knex) {
  const names = Object.keys(permissions);
  const permissionRows = await knex("permissions").select("id").whereIn("name", names);
  const ids = permissionRows.map((row) => row.id);
  if (ids.length > 0) {
    await knex("role_permissions").whereIn("permission_id", ids).delete();
    await knex("permissions").whereIn("id", ids).delete();
  }

  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("position_id");
  });

  await knex.schema.dropTableIfExists("positions");
};
