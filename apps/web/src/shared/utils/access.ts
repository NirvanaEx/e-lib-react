import type { AuthUser } from "../hooks/useAuth";

const dashboardRoutes = [
  { path: "/dashboard/users", permission: "user.read" },
  { path: "/dashboard/departments", permission: "department.read" },
  { path: "/dashboard/sessions", permission: "session.read" },
  { path: "/dashboard/sections", permission: "section.read" },
  { path: "/dashboard/categories", permission: "category.read" },
  { path: "/dashboard/files", permission: "file.read" },
  { path: "/dashboard/trash", permission: "file.trash.read" },
  { path: "/dashboard/stats", permission: "stats.read" },
  { path: "/dashboard/audit", permission: "audit.read" }
];

export function hasAccess(user: AuthUser | null, permissions: string[]) {
  if (!user) return false;
  if (permissions.length === 0) return true;
  const userPermissions = user.permissions || [];
  return permissions.every((permission) => userPermissions.includes(permission));
}

export function getDefaultRoute(user: AuthUser | null) {
  if (!user) return "/login";
  const userPermissions = user.permissions || [];
  if (userPermissions.includes("dashboard.access")) {
    const match = dashboardRoutes.find((route) => userPermissions.includes(route.permission));
    if (match) return match.path;
  }
  return "/users";
}
