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

export async function restoreTrashItem(payload: { id: number; type: "file" | "version" | "asset" }) {
  const { data } = await api.post(`/dashboard/trash/${payload.type}/${payload.id}/restore`);
  return data;
}

export async function forceDeleteTrashItem(payload: { id: number; type: "file" | "version" | "asset" }) {
  const { data } = await api.delete(`/dashboard/trash/${payload.type}/${payload.id}`);
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

export async function fetchUserFileVersions(id: number) {
  const { data } = await api.get(`/user/files/${id}/versions`);
  return data;
}

export async function downloadUserFile(id: number, lang?: string) {
  return api.post(`/user/files/${id}/download`, { lang }, { responseType: "blob" });
}

export async function downloadUserFileVersion(id: number, versionId: number, lang?: string) {
  return api.post(`/user/files/${id}/versions/${versionId}/download`, { lang }, { responseType: "blob" });
}

export async function fetchMenu() {
  const { data } = await api.get("/user/menu/all");
  return data;
}

export async function fetchMyFiles(params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string }) {
  const { data } = await api.get("/user/my-files", { params });
  return data;
}

export async function fetchDepartmentFiles(params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string }) {
  const { data } = await api.get("/user/department-files", { params });
  return data;
}

export async function fetchUserFavorites(params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string }) {
  const { data } = await api.get("/user/favorites", { params });
  return data;
}

export async function fetchUserRequests(params: { page: number; pageSize: number; status?: string; scope?: string; q?: string }) {
  const { data } = await api.get("/user/requests", { params });
  return data;
}

export async function fetchUserRequestAccessOptions() {
  const { data } = await api.get("/user/requests/access-options");
  return data;
}

export async function createUserRequest(payload: any) {
  const { data } = await api.post("/user/requests", payload);
  return data;
}

export async function createUserUpdateRequest(fileId: number, payload: any) {
  const { data } = await api.post(`/user/requests/update/${fileId}`, payload);
  return data;
}

export async function uploadUserRequestAsset(requestId: number, payload: FormData) {
  const { data } = await api.post(`/user/requests/${requestId}/assets`, payload, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

export async function cancelUserRequest(requestId: number) {
  const { data } = await api.post(`/user/requests/${requestId}/cancel`);
  return data;
}

export async function addUserFavorite(fileId: number) {
  const { data } = await api.post(`/user/favorites/${fileId}`);
  return data;
}

export async function removeUserFavorite(fileId: number) {
  const { data } = await api.delete(`/user/favorites/${fileId}`);
  return data;
}

export async function fetchDashboardRequests(params: { page: number; pageSize: number; status?: string; scope?: string; q?: string }) {
  const { data } = await api.get("/dashboard/requests", { params });
  return data;
}

export async function approveDashboardRequest(requestId: number) {
  const { data } = await api.post(`/dashboard/requests/${requestId}/approve`);
  return data;
}

export async function rejectDashboardRequest(requestId: number, payload?: { reason?: string | null }) {
  const { data } = await api.post(`/dashboard/requests/${requestId}/reject`, payload || {});
  return data;
}

export async function fetchDashboardRequestAssets(requestId: number) {
  const { data } = await api.get(`/dashboard/requests/${requestId}/assets`);
  return data;
}

export async function downloadDashboardRequestAsset(requestId: number, assetId: number) {
  return api.get(`/dashboard/requests/${requestId}/assets/${assetId}/download`, { responseType: "blob" });
}
