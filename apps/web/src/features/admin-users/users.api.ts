import api from "../../shared/api/client";

export async function fetchUsers(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/dashboard/users", { params });
  return data;
}

export async function createUser(payload: any) {
  const { data } = await api.post("/dashboard/users", payload);
  return data;
}

export async function updateUser(id: number, payload: any) {
  const { data } = await api.patch(`/dashboard/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: number) {
  const { data } = await api.delete(`/dashboard/users/${id}`);
  return data;
}

export async function restoreUser(id: number) {
  const { data } = await api.post(`/dashboard/users/${id}/restore`);
  return data;
}

export async function resetUserPassword(id: number) {
  const { data } = await api.post(`/dashboard/users/${id}/reset-password`);
  return data;
}

export async function fetchRoles() {
  const { data } = await api.get("/dashboard/roles");
  return data;
}

export async function fetchUserOptions(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/dashboard/users/options", { params });
  return data;
}
