import api from "../../shared/api/client";

export async function login(payload: { login: string; password: string }) {
  const { data } = await api.post("/auth/login", payload);
  return data;
}

export async function me() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function changeTempPassword(payload: { currentPassword: string; newPassword: string }) {
  const { data } = await api.post("/auth/change-temp-password", payload);
  return data;
}

export async function logout() {
  const { data } = await api.post("/auth/logout");
  return data;
}
