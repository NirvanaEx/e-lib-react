import api from "../../shared/api/client";

export type GuideKey = "user" | "admin";

export type GuideBlock = {
  id: number;
  number: number;
  image: string | null;
  // Размеры приходят с сервера: под картинку резервируется место, иначе при
  // ленивой загрузке блоки прыгают и переход по оглавлению промахивается.
  imageWidth: number | null;
  imageHeight: number | null;
  title: string;
  body: string;
};

export type GuideResponse = {
  key: GuideKey;
  isActive: boolean;
  updatedAt: string | null;
  blocks: GuideBlock[];
};

export type GuideEditBlock = {
  id: number;
  image: string | null;
  translations: { lang: "ru" | "en" | "uz"; title: string; body: string }[];
};

export type GuideEditResponse = {
  key: GuideKey;
  isActive: boolean;
  updatedAt: string | null;
  langs: ("ru" | "en" | "uz")[];
  blocks: GuideEditBlock[];
};

export type GuideStatuses = { user: boolean; admin: boolean };

// Статусы нужны меню: выключенную инструкцию не показываем вовсе.
export async function fetchGuideStatuses() {
  const { data } = await api.get<GuideStatuses>("/guides");
  return data;
}

export async function setGuideActive(key: GuideKey, isActive: boolean) {
  const { data } = await api.patch<GuideEditResponse>(`/dashboard/guides/${key}/settings`, { isActive });
  return data;
}

export async function fetchGuide(key: GuideKey) {
  const { data } = await api.get<GuideResponse>(`/guides/${key}`);
  return data;
}

export async function fetchGuideForEdit(key: GuideKey) {
  const { data } = await api.get<GuideEditResponse>(`/dashboard/guides/${key}`);
  return data;
}

export async function updateGuide(
  key: GuideKey,
  payload: { blocks: { image?: string | null; translations: { lang: string; title: string; body: string }[] }[] }
) {
  const { data } = await api.put<GuideEditResponse>(`/dashboard/guides/${key}`, payload);
  return data;
}

export async function resetGuide(key: GuideKey) {
  const { data } = await api.post<GuideEditResponse>(`/dashboard/guides/${key}/reset`);
  return data;
}

export async function uploadGuideImage(key: GuideKey, file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<{ image: string }>(`/dashboard/guides/${key}/image`, form);
  return data;
}

// Картинка лежит либо в поставке, либо в загрузках; на клиенте различать нечего.
export function getGuideImageUrl(image: string | null | undefined) {
  if (!image) return null;
  const name = image.split("/").pop();
  if (!name) return null;
  const base = api.defaults.baseURL || "";
  return `${base}/guides/image/${encodeURIComponent(name)}`;
}

export async function downloadGuideDocx(key: GuideKey) {
  const response = await api.get(`/guides/${key}/docx`, { responseType: "blob" });
  const disposition = String(response.headers["content-disposition"] || "");
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i) || disposition.match(/filename="?([^";]+)"?/i);
  const fileName = match ? decodeURIComponent(match[1]) : `${key}-guide.docx`;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
