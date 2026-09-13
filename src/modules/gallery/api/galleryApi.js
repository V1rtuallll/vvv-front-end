import request from "@/utils/request";

export const getGalleryPage = (params) => request.get("/gallery/list", { params });
// 一次请求一个文件。onUploadProgress 驱动进度条，signal 用于取消。
export const uploadGalleryFile = (formData, onUploadProgress, signal) =>
  request.post("/gallery/upload", formData, { onUploadProgress, signal });
// 大小上限来自后端配置，前端不另写固定值
export const getUploadLimit = () => request.get("/gallery/upload-limit");
export const getGalleryComments = (id) => request.get(`/gallery/comments/${id}`);
export const postGalleryComment = (payload) => request.post("/gallery/comment", payload);
export const likeGallery = (id) => request.post("/gallery/like", { id });
export const isGalleryLiked = (id) => request.get(`/gallery/isLiked/${id}`);
export const likeGalleryComment = (commentId) => request.post("/gallery/comment/like", { comment_id: commentId });

// 换文件走独立接口：它会同步两张表的 src 并清掉旧的 OSS 对象
export const replaceGalleryFile = (id, formData, onUploadProgress, signal) =>
  request.post(`/gallery/${id}/replace`, formData, { onUploadProgress, signal });
// 撤销一次上传：按客户端上传 ID 删掉已入库的行与已上传的 OSS 对象（幂等）
export const cancelUpload = (clientUploadId) =>
  request.delete(`/gallery/upload/${encodeURIComponent(clientUploadId)}`);
export const updateGallery = (id, payload) => request.patch(`/gallery/${id}`, payload);
export const deleteGallery = (id) => request.delete(`/gallery/${id}`);
export const deleteComment = (commentId) => request.delete(`/gallery/comments/${commentId}`);
