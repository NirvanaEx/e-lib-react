import api from "../../shared/api/client";

export async function fetchDepartments(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/admin/departments", { params });
  return data;
}

export async function createDepartment(payload: any) {
  const { data } = await api.post("/admin/departments", payload);
  return data;
}

export async function updateDepartment(id: number, payload: any) {
  const { data } = await api.patch(`/admin/departments/${id}`, payload);
  return data;
}

export async function deleteDepartment(id: number) {
  const { data } = await api.delete(`/admin/departments/${id}`);
  return data;
}
