import api from "../../shared/api/client";

export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  const { data } = await api.post("/user/settings/password", payload);
  return data;
}

export async function changeLanguage(lang: string) {
  const { data } = await api.post("/user/settings/language", { lang });
  return data;
}
