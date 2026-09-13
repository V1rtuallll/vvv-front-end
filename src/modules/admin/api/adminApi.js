import request from "@/utils/request";

export const getAdminHomeConfig = () => request.get("/admin/home/config");
export const saveAdminHomeConfig = (payload) => request.post("/admin/home/config", payload);
export const syncOssResources = (types) => request.post("/admin/sync-oss-to-db", { types });
// 与画廊上传共用同一套队列：onUploadProgress 驱动进度，signal 用于取消。
export const uploadAdminResource = (formData, onUploadProgress, signal) => request.post("/admin/upload-resource", formData, {
  headers: { "Content-Type": "multipart/form-data" },
  onUploadProgress,
  signal,
});
export const getAdminResources = (params) => request.get("/admin/resources", { params });
export const updateAdminResource = (payload) => request.post("/admin/resource/update", payload);
