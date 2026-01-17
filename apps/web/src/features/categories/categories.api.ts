import api from "../../shared/api/client";

export async function fetchCategories(params: { page: number; pageSize: number; q?: string; sectionId?: number }) {
  const { data } = await api.get("/manage/categories", { params });
  return data;
}

export async function createCategory(payload: any) {
  const { data } = await api.post("/manage/categories", payload);
  return data;
}

export async function deleteCategory(id: number) {
  const { data } = await api.delete(`/manage/categories/${id}`);
  return data;
}
