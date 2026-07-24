import api from "../api/client";

// The `v` query param busts the browser cache: every upload gets a new filename.
export function getAvatarUrl(user?: { id: number; avatar?: string | null } | null) {
  if (!user?.avatar) return undefined;
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  return `${base}/users/${user.id}/avatar?v=${encodeURIComponent(user.avatar)}`;
}
