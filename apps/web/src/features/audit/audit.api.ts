import api from "../../shared/api/client";

export async function fetchAudit(scope: "admin" | "manage", params: { page: number; pageSize: number }) {
  const { data } = await api.get(`/${scope}/audit`, { params });
  return data;
}
