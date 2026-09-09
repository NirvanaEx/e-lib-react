import api from "../../shared/api/client";

export async function fetchSessions(params: { sortBy?: string; sortDir?: string; page: number; pageSize: number; userId?: number; from?: string; to?: string }) {
  const { data } = await api.get("/dashboard/sessions", { params });
  return data;
}
