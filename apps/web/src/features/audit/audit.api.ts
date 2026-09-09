import api from "../../shared/api/client";

export async function fetchAudit(params: { sortBy?: string; sortDir?: string;
  page: number;
  pageSize: number;
  actorId?: number;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}) {
  const { data } = await api.get("/dashboard/audit", { params });
  return data;
}
