import api from "../../shared/api/client";

export async function fetchTopFiles(params?: { from?: string; to?: string }) {
  const { data } = await api.get("/manage/stats/top-files", { params });
  return data;
}

export async function fetchUserDownloads(params: { userId: number; from?: string; to?: string }) {
  const { data } = await api.get("/manage/stats/user-downloads", { params });
  return data;
}

export async function fetchDownloadsByPeriod(params?: { from?: string; to?: string; bucket?: string }) {
  const { data } = await api.get("/manage/stats/downloads-by-period", { params });
  return data;
}
