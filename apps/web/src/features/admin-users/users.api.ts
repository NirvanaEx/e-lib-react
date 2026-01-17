import api from "../../shared/api/client";

export async function fetchUsers(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/admin/users", { params });
  return data;
}

export async function createUser(payload: any) {
  const { data } = await api.post("/admin/users", payload);
  return data;
}

export async function updateUser(id: number, payload: any) {
  const { data } = await api.patch(`/admin/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: number) {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
}

export async function restoreUser(id: number) {
  const { data } = await api.post(`/admin/users/${id}/restore`);
  return data;
}

export async function resetUserPassword(id: number) {
  const { data } = await api.post(`/admin/users/${id}/reset-password`);
  return data;
}

export async function fetchRoles() {
  const { data } = await api.get("/admin/roles");
  return data;
}
