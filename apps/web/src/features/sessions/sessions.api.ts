import api from "../../shared/api/client";

export async function fetchSessions(params: { page: number; pageSize: number; userId?: number }) {
  const { data } = await api.get("/admin/sessions", { params });
  return data;
}
