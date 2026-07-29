import api from "../../shared/api/client";

export async function fetchPositions(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/dashboard/positions", { params });
  return data;
}

export async function createPosition(payload: any) {
  const { data } = await api.post("/dashboard/positions", payload);
  return data;
}

export async function updatePosition(id: number, payload: any) {
  const { data } = await api.patch(`/dashboard/positions/${id}`, payload);
  return data;
}

export async function deletePosition(id: number) {
  const { data } = await api.delete(`/dashboard/positions/${id}`);
  return data;
}

export async function fetchPositionOptions(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/dashboard/positions/options", { params });
  return data;
}
