import api from "../../shared/api/client";

export async function fetchSeedStatus() {
  const { data } = await api.get("/dashboard/seed/status");
  return data;
}

export async function runSeedSections() {
  const { data } = await api.post("/dashboard/seed/sections");
  return data;
}

export async function runSeedDemo() {
  const { data } = await api.post("/dashboard/seed/demo");
  return data;
}
