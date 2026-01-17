import api from "../../shared/api/client";

export async function fetchFiles(params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string }) {
  const { data } = await api.get("/dashboard/files", { params });
  return data;
}

export async function fetchFile(id: number) {
  const { data } = await api.get(`/dashboard/files/${id}`);
  return data;
}

export async function createFile(payload: any) {
  const { data } = await api.post("/dashboard/files", payload);
  return data;
}

export async function updateFile(id: number, payload: any) {
  const { data } = await api.patch(`/dashboard/files/${id}`, payload);
  return data;
}

export async function updateAccess(id: number, payload: any) {
  const { data } = await api.patch(`/dashboard/files/${id}/access`, payload);
  return data;
}

export async function deleteFile(id: number) {
  const { data } = await api.delete(`/dashboard/files/${id}`);
  return data;
}

export async function restoreFile(id: number) {
  const { data } = await api.post(`/dashboard/files/${id}/restore`);
  return data;
}

export async function fetchVersions(fileId: number) {
  const { data } = await api.get(`/dashboard/files/${fileId}/versions`);
  return data;
}

export async function createVersion(fileId: number, payload: any) {
  const { data } = await api.post(`/dashboard/files/${fileId}/versions`, payload);
  return data;
}

export async function setCurrentVersion(fileId: number, payload: any) {
  const { data } = await api.patch(`/dashboard/files/${fileId}/current-version`, payload);
  return data;
}

export async function deleteVersion(fileId: number, versionId: number) {
  const { data } = await api.delete(`/dashboard/files/${fileId}/versions/${versionId}`);
  return data;
}

export async function restoreVersion(fileId: number, versionId: number) {
  const { data } = await api.post(`/dashboard/files/${fileId}/versions/${versionId}/restore`);
  return data;
}

export async function uploadAsset(fileId: number, versionId: number, payload: FormData) {
  const { data } = await api.post(`/dashboard/files/${fileId}/versions/${versionId}/assets`, payload, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

export async function deleteAsset(fileId: number, versionId: number, assetId: number) {
  const { data } = await api.delete(`/dashboard/files/${fileId}/versions/${versionId}/assets/${assetId}`);
  return data;
}

export async function fetchTrash(params: { page: number; pageSize: number; q?: string }) {
  const { data } = await api.get("/dashboard/trash", { params });
  return data;
}

export async function forceDelete(id: number) {
  const { data } = await api.delete(`/dashboard/trash/${id}`);
  return data;
}

export async function fetchUserFiles(params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string; sectionId?: number; categoryId?: number }) {
  const { data } = await api.get("/user/files", { params });
  return data;
}

export async function fetchUserFile(id: number) {
  const { data } = await api.get(`/user/files/${id}`);
  return data;
}

export async function downloadUserFile(id: number, lang?: string) {
  const { data } = await api.post(`/user/files/${id}/download`, { lang }, { responseType: "blob" });
  return data;
}

export async function fetchMenu() {
  const { data } = await api.get("/user/menu");
  return data;
}
