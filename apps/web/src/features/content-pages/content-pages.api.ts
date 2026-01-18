import api from "../../shared/api/client";

export type ContentPageTranslation = {
  lang: "ru" | "en" | "uz";
  title: string;
  body: string;
};

export type ContentPageAdminResponse = {
  key: string;
  displayMode: "once" | "every_login";
  requiresAcceptance: boolean;
  isActive: boolean;
  translations: ContentPageTranslation[];
};

export type ContentPageUserResponse = {
  key: string;
  title: string | null;
  body: string | null;
  displayMode: "once" | "every_login";
  requiresAcceptance: boolean;
  isActive: boolean;
  shouldShow: boolean;
};

export async function fetchContentPage(key: string) {
  const { data } = await api.get<ContentPageAdminResponse>(`/dashboard/content-pages/${key}`);
  return data;
}

export async function updateContentPage(
  key: string,
  payload: {
    translations: ContentPageTranslation[];
    displayMode: "once" | "every_login";
    isActive?: boolean;
    requiresAcceptance?: boolean;
  }
) {
  const { data } = await api.put(`/dashboard/content-pages/${key}`, payload);
  return data;
}

export async function fetchUserContentPage(key: string) {
  const { data } = await api.get<ContentPageUserResponse | null>(`/user/content-pages/${key}`);
  return data;
}

export async function acceptUserContentPage(key: string) {
  const { data } = await api.post(`/user/content-pages/${key}/accept`);
  return data;
}
