exports.seed = async function (knex) {
  const roles = await knex("roles").select("id", "name");
  const permissions = await knex("permissions").select("id", "name");

  const roleByName = new Map(roles.map((role) => [role.name, role.id]));
  const permsByName = new Map(permissions.map((perm) => [perm.name, perm.id]));

  const allPermissions = permissions.map((perm) => perm.name);
  const managerPermissions = [
    "dashboard.access",
    "section.read",
    "section.add",
    "section.update",
    "section.delete",
    "category.read",
    "category.add",
    "category.update",
    "category.delete",
    "file.read",
    "file.add",
    "file.update",
    "file.delete",
    "file.restore",
    "file.force_delete",
    "file.access.update",
    "file.version.read",
    "file.version.add",
    "file.version.delete",
    "file.version.restore",
    "file.version.set_current",
    "file.asset.upload",
    "file.asset.delete",
    "file.download",
    "file.download.restricted",
    "storage.read"
  ];
  const userPermissions = ["file.read", "file.download"];

  const mappings = [
    {
      role: "superadmin",
      permissions: allPermissions
    },
    {
      role: "admin",
      permissions: allPermissions
    },
    {
      role: "manager",
      permissions: managerPermissions
    },
    {
      role: "user",
      permissions: userPermissions
    }
  ];

  await knex("role_permissions").del();

  const rows = [];
  for (const mapping of mappings) {
    const roleId = roleByName.get(mapping.role);
    if (!roleId) {
      throw new Error(`Role not found: ${mapping.role}`);
    }
    for (const permName of mapping.permissions) {
      const permissionId = permsByName.get(permName);
      if (!permissionId) {
        throw new Error(`Permission not found: ${permName}`);
      }
      rows.push({ role_id: roleId, permission_id: permissionId });
    }
  }

  if (rows.length > 0) {
    await knex("role_permissions").insert(rows);
  }
};
