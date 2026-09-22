import request from "@/utils/request";

export const getGalleryPage = (params) => request.get("/gallery/list", { params });
// 按主键或地址取单条：深链的目标可能不在当前页，列表接口翻不到。查不到时后端回 404
export const getGalleryItem = (params) => request.get("/gallery/item", { params });
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

/**
 * 往一个已有作品追加一个媒体。
 *
 * 与 uploadGalleryFile 是两条路：那个建作品行，这个只往媒体列表末尾加一条。
 * 多选上传时除第一个文件之外全走这里。追加的位置是服务端按 sort_order 现算的，
 * 所以调用方必须串行发送 —— 两个追加并发到达会取到同一个位置。
 */
export const appendGalleryMedia = (id, formData, onUploadProgress, signal) =>
  request.post(`/gallery/${id}/media`, formData, { onUploadProgress, signal });

// 换文件走独立接口：它会同步两张表的 src 并清掉旧的 OSS 对象
export const replaceGalleryFile = (id, formData, onUploadProgress, signal) =>
  request.post(`/gallery/${id}/replace`, formData, { onUploadProgress, signal });
// 撤销一次上传：按客户端上传 ID 删掉已入库的行与已上传的 OSS 对象（幂等）
export const cancelUpload = (clientUploadId) =>
  request.delete(`/gallery/upload/${encodeURIComponent(clientUploadId)}`);
export const updateGallery = (id, payload) => request.patch(`/gallery/${id}`, payload);
export const deleteGallery = (id) => request.delete(`/gallery/${id}`);
export const deleteComment = (commentId) => request.delete(`/gallery/comments/${commentId}`);
// 背景音乐上传：走独立接口，只在登记表里记一行，**不建画廊项** ——
// 所以它不会出现在画廊列表里。这是隔离方案的关键，不要在别处「顺手」改成普通上传。
export const uploadGalleryBgm = (formData) => request.post("/gallery/bgm", formData);
// 「挑一首背景音乐」的候选：有声音的项 + 自己配过 BGM 的图文项。不分页
export const getGalleryBgmCandidates = () => request.get("/gallery/bgm-candidates");
