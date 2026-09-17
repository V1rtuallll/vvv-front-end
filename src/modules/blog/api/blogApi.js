import request from "@/utils/request";

// 后端入口在 controller/BlogController.java（@RequestMapping("/api/blog")）。
// 三处与 gallery 不同，改错就是 404 或 400：
//   1. 新建是 POST /blog（没有尾斜杠、也没有子路径）
//   2. 评论入参是 camelCase 的 { blogId, content, parentId }（gallery 用的是下划线）
//   3. 评论点赞入参是 { commentId }（gallery 用的是 comment_id）
export const getBlogList = (params) => request.get("/blog/list", { params });
export const getLatestBlogs = (params) => request.get("/blog/latest", { params });
export const getBlogDetail = (id) => request.get(`/blog/detail/${id}`);
export const getBlogComments = (id) => request.get(`/blog/comments/${id}`);
export const createBlog = (payload) => request.post("/blog", payload);
export const updateBlog = (id, payload) => request.patch(`/blog/${id}`, payload);
export const deleteBlog = (id) => request.delete(`/blog/${id}`);
// 一次请求一个文件。onUploadProgress 驱动进度条，signal 用于中止。
// 后端只认 multipart 里的 file 字段，返回的 data 是 OSS 公开地址。
export const uploadBlogMedia = (formData, onUploadProgress, signal) =>
  request.post("/blog/upload-media", formData, { onUploadProgress, signal });
export const postBlogComment = (payload) => request.post("/blog/comment", payload);
export const likeBlogComment = (commentId) => request.post("/blog/comment/like", { commentId });
export const deleteBlogComment = (commentId) => request.delete(`/blog/comments/${commentId}`);
