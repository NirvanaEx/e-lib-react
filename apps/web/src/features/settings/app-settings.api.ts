import api from "../../shared/api/client";

export type AppSettings = {
  testRibbonEnabled: boolean;
};

// Public read — available to any authenticated user (used to decide whether the
// test-version ribbon is shown).
export async function fetchAppSettings() {
  const { data } = await api.get<AppSettings>("/user/app-settings");
  return data;
}

// Admin read/write (dashboard content permissions).
export async function fetchAdminAppSettings() {
  const { data } = await api.get<AppSettings>("/dashboard/settings");
  return data;
}

export async function updateAppSettings(payload: Partial<AppSettings>) {
  const { data } = await api.put<AppSettings>("/dashboard/settings", payload);
  return data;
}
