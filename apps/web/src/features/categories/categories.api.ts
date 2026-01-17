import api from "../../shared/api/client";

export async function fetchCategories(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/manage/categories", { params });
  return data;
}

export async function fetchCategory(id: number) {
  const { data } = await api.get(`/manage/categories/${id}`);
  return data;
}

export async function createCategory(payload: any) {
  const { data } = await api.post("/manage/categories", payload);
  return data;
}

export async function updateCategory(id: number, payload: any) {
  const { data } = await api.patch(`/manage/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id: number) {
  const { data } = await api.delete(`/manage/categories/${id}`);
  return data;
}
