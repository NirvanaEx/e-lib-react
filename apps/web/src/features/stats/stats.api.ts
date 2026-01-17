import api from "../../shared/api/client";

export async function fetchTopFiles() {
  const { data } = await api.get("/manage/stats/top-files");
  return data;
}

export async function fetchDownloadsByPeriod() {
  const { data } = await api.get("/manage/stats/downloads-by-period");
  return data;
}
