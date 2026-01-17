import api from "../../shared/api/client";

export async function fetchAudit(
  scope: "admin" | "manage",
  params: {
    page: number;
    pageSize: number;
    actorId?: number;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }
) {
  const { data } = await api.get(`/${scope}/audit`, { params });
  return data;
}
