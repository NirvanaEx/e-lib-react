import api from "../../shared/api/client";

export async function fetchRoles() {
  const { data } = await api.get("/dashboard/roles");
  return data;
}

export async function createRole(payload: { name: string; level?: number }) {
  const { data } = await api.post("/dashboard/roles", payload);
  return data;
}

export async function fetchPermissions() {
  const { data } = await api.get("/dashboard/roles/permissions");
  return data;
}

export async function fetchRolePermissions(roleId: number) {
  const { data } = await api.get(`/dashboard/roles/${roleId}/permissions`);
  return data;
}

export async function updateRolePermissions(roleId: number, payload: { permissions: string[] }) {
  const { data } = await api.patch(`/dashboard/roles/${roleId}/permissions`, payload);
  return data;
}
