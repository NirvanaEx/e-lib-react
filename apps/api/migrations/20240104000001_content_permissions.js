const PERMISSIONS = ["content.read", "content.update"];
const ROLE_NAMES = ["superadmin", "admin"];

exports.up = async function (knex) {
  const existing = await knex("permissions").whereIn("name", PERMISSIONS).select("id", "name");
  const existingNames = new Set(existing.map((row) => row.name));
  const insertRows = PERMISSIONS.filter((name) => !existingNames.has(name)).map((name) => ({
    name,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  }));

  if (insertRows.length > 0) {
    await knex("permissions").insert(insertRows);
  }

  const perms = await knex("permissions").whereIn("name", PERMISSIONS).select("id", "name");
  const roles = await knex("roles").whereIn("name", ROLE_NAMES).select("id", "name");

  if (perms.length === 0 || roles.length === 0) {
    return;
  }

  const permIds = perms.map((perm) => perm.id);
  const roleIds = roles.map((role) => role.id);
  const existingRolePerms = await knex("role_permissions")
    .whereIn("role_id", roleIds)
    .whereIn("permission_id", permIds)
    .select("role_id", "permission_id");

  const existingPairs = new Set(
    existingRolePerms.map((row) => `${row.role_id}:${row.permission_id}`)
  );

  const rows = [];
  roles.forEach((role) => {
    perms.forEach((perm) => {
      const key = `${role.id}:${perm.id}`;
      if (!existingPairs.has(key)) {
        rows.push({ role_id: role.id, permission_id: perm.id });
      }
    });
  });

  if (rows.length > 0) {
    await knex("role_permissions").insert(rows);
  }
};

exports.down = async function (knex) {
  const perms = await knex("permissions").whereIn("name", PERMISSIONS).select("id");
  const permIds = perms.map((perm) => perm.id);

  if (permIds.length > 0) {
    await knex("role_permissions").whereIn("permission_id", permIds).delete();
    await knex("permissions").whereIn("id", permIds).delete();
  }
};
