import api from "../../shared/api/client";

export async function fetchSections(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/manage/sections", { params });
  return data;
}

export async function fetchSection(id: number) {
  const { data } = await api.get(`/manage/sections/${id}`);
  return data;
}

export async function createSection(payload: any) {
  const { data } = await api.post("/manage/sections", payload);
  return data;
}

export async function updateSection(id: number, payload: any) {
  const { data } = await api.patch(`/manage/sections/${id}`, payload);
  return data;
}

export async function deleteSection(id: number) {
  const { data } = await api.delete(`/manage/sections/${id}`);
  return data;
}
