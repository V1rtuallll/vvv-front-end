import request from "@/utils/request";

export const getAdminHomeConfig = () => request.get("/admin/home/config");
export const saveAdminHomeConfig = (payload) => request.post("/admin/home/config", payload);
export const syncOssResources = (types) => request.post("/admin/sync-oss-to-db", { types });
export const uploadAdminResource = (formData, onUploadProgress) => request.post("/admin/upload-resource", formData, {
  headers: { "Content-Type": "multipart/form-data" },
  onUploadProgress,
});
export const getAdminResources = (params) => request.get("/admin/resources", { params });
export const updateAdminResource = (payload) => request.post("/admin/resource/update", payload);
