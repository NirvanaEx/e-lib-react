import api from "../../shared/api/client";

export type StatsRange = { from?: string; to?: string };

export type ActivityFilters = StatsRange & {
  page?: number;
  pageSize?: number;
  userId?: number;
  fileItemId?: number;
  departmentId?: number;
  action?: string;
  q?: string;
  sortDir?: string;
};

export async function fetchStatsOverview(params?: StatsRange) {
  const { data } = await api.get("/dashboard/stats/overview", { params });
  return data;
}

export async function fetchActivity(params: ActivityFilters) {
  const { data } = await api.get("/dashboard/stats/activity", { params });
  return data;
}

export async function fetchTopFiles(params?: StatsRange & { limit?: number }) {
  const { data } = await api.get("/dashboard/stats/top-files", { params });
  return data;
}

export async function fetchTopUsers(params?: StatsRange & { limit?: number }) {
  const { data } = await api.get("/dashboard/stats/top-users", { params });
  return data;
}

export async function fetchStatsByDepartment(params?: StatsRange) {
  const { data } = await api.get("/dashboard/stats/by-department", { params });
  return data;
}

export async function fetchStatsByPeriod(params?: StatsRange & { bucket?: string }) {
  const { data } = await api.get("/dashboard/stats/by-period", { params });
  return data;
}

export async function fetchFileActivity(fileItemId: number, params?: StatsRange) {
  const { data } = await api.get(`/dashboard/stats/files/${fileItemId}/activity`, { params });
  return data;
}

export async function fetchLoginActivity(params?: StatsRange & { limit?: number }) {
  const { data } = await api.get("/dashboard/stats/logins", { params });
  return data;
}

export async function fetchStorageUsage() {
  const { data } = await api.get("/dashboard/stats/storage");
  return data;
}

export async function fetchLargestFiles(params?: { limit?: number }) {
  const { data } = await api.get("/dashboard/stats/storage/largest", { params });
  return data;
}

// The export mirrors the active filters, so it is fetched as a blob and saved
// client-side instead of navigating away from the page.
export async function downloadActivityCsv(params: ActivityFilters) {
  const response = await api.get("/dashboard/stats/activity/export", {
    params,
    responseType: "blob"
  });
  return response.data as Blob;
}
