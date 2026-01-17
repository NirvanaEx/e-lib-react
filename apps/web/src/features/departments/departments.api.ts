import api from "../../shared/api/client";

export async function fetchDepartments(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/dashboard/departments", { params });
  return data;
}

export async function createDepartment(payload: any) {
  const { data } = await api.post("/dashboard/departments", payload);
  return data;
}

export async function updateDepartment(id: number, payload: any) {
  const { data } = await api.patch(`/dashboard/departments/${id}`, payload);
  return data;
}

export async function deleteDepartment(id: number) {
  const { data } = await api.delete(`/dashboard/departments/${id}`);
  return data;
}

export async function fetchDepartmentOptions(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/dashboard/departments/options", { params });
  return data;
}
