import request from "@/utils/request";

export const getGalleryPage = (params) => request.get("/gallery/list", { params });
export const uploadGalleryMedia = (formData) => request.post("/gallery/upload", formData);
export const getGalleryComments = (id) => request.get(`/gallery/comments/${id}`);
export const postGalleryComment = (payload) => request.post("/gallery/comment", payload);
export const likeGallery = (id) => request.post("/gallery/like", { id });
export const isGalleryLiked = (id) => request.get(`/gallery/isLiked/${id}`);
export const likeGalleryComment = (commentId) => request.post("/gallery/comment/like", { comment_id: commentId });
