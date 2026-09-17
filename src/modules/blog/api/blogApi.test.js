import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import request from "@/utils/request";
import {
  createBlog,
  deleteBlog,
  deleteBlogComment,
  getBlogComments,
  getBlogDetail,
  getBlogList,
  getLatestBlogs,
  likeBlogComment,
  postBlogComment,
  updateBlog,
  uploadBlogMedia,
} from "@/modules/blog/api/blogApi";

describe("blogApi 的路径与方法", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("列表与右栏走 /blog/list 与 /blog/latest，参数放在 params 里", () => {
    getBlogList({ page: 2, limit: 10 });
    expect(request.get).toHaveBeenCalledWith("/blog/list", { params: { page: 2, limit: 10 } });

    getLatestBlogs({ limit: 5 });
    expect(request.get).toHaveBeenLastCalledWith("/blog/latest", { params: { limit: 5 } });
  });

  it("详情与评论列表走 /blog/detail/:id 与 /blog/comments/:id", () => {
    getBlogDetail(7);
    expect(request.get).toHaveBeenCalledWith("/blog/detail/7");

    getBlogComments(7);
    expect(request.get).toHaveBeenLastCalledWith("/blog/comments/7");
  });

  it("新建是 POST /blog，不带尾斜杠", () => {
    // Spring 6 不再匹配尾斜杠，写成 /blog/ 会 404
    const payload = { title: "t", content: "c", coverImage: "", status: 1 };

    createBlog(payload);

    expect(request.post).toHaveBeenCalledWith("/blog", payload);
  });

  it("更新走 PATCH /blog/:id，删除走 DELETE /blog/:id", () => {
    updateBlog(7, { title: "t" });
    expect(request.patch).toHaveBeenCalledWith("/blog/7", { title: "t" });

    deleteBlog(7);
    expect(request.delete).toHaveBeenCalledWith("/blog/7");
  });

  it("媒体上传把文件放在 FormData 里，进度回调透传下去", () => {
    const formData = new FormData();
    const onUploadProgress = () => {};

    uploadBlogMedia(formData, onUploadProgress, undefined);

    expect(request.post).toHaveBeenCalledWith("/blog/upload-media", formData, {
      onUploadProgress,
      signal: undefined,
    });
  });

  it("评论三个接口的入参形状与后端一致（camelCase）", () => {
    postBlogComment({ blogId: 7, content: "内容" });
    expect(request.post).toHaveBeenCalledWith("/blog/comment", { blogId: 7, content: "内容" });

    likeBlogComment(3);
    expect(request.post).toHaveBeenLastCalledWith("/blog/comment/like", { commentId: 3 });

    deleteBlogComment(3);
    expect(request.delete).toHaveBeenCalledWith("/blog/comments/3");
  });
});
