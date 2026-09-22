import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import request from "@/utils/request";
import {
  appendGalleryMedia,
  commitGalleryMedia,
  getGalleryBgmCandidates,
  uploadGalleryBgm,
} from "@/modules/gallery/api/galleryApi";

describe("galleryApi 的背景音乐接口", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * BGM 走的不是普通上传接口。
   *
   * 写成 /gallery/upload 的话，服务端会**建一条画廊项** —— 随图上传的背景音乐
   * 就会出现在画廊列表里，而页面不报错，只是多了一张不该有的图。
   */
  it("上传走 /gallery/bgm，不是 /gallery/upload", () => {
    const formData = new FormData();

    uploadGalleryBgm(formData);

    expect(request.post).toHaveBeenCalledWith("/gallery/bgm", formData);
  });

  it("候选列表走 GET /gallery/bgm-candidates，不带参数", () => {
    getGalleryBgmCandidates();

    expect(request.get).toHaveBeenCalledWith("/gallery/bgm-candidates");
  });
});

describe("galleryApi 的追加媒体接口", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** 走 /gallery/upload 的话服务端会**再建一条作品行**，多选上传就成了 N 个作品 */
  it("走 /gallery/{id}/media，不是再传一次 /gallery/upload", () => {
    const formData = new FormData();

    appendGalleryMedia(7, formData);

    expect(request.post).toHaveBeenCalledWith("/gallery/7/media", formData, expect.anything());
  });

  /** 追加也要能取消：中途取消要能中止在途请求，不然那一份照样会上传完 */
  it("把进度回调与取消信号透传给 axios", () => {
    const formData = new FormData();
    const onUploadProgress = () => {};
    const controller = new AbortController();

    appendGalleryMedia(7, formData, onUploadProgress, controller.signal);

    expect(request.post).toHaveBeenCalledWith("/gallery/7/media", formData, {
      onUploadProgress,
      signal: controller.signal,
    });
  });
});

describe("galleryApi 的编辑提交接口", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 后端已经把 PATCH /gallery/{id} 与 POST /gallery/{id}/replace 摘掉了，
   * 编辑保存只剩这一条 PUT。走错门的话编辑功能整体失效，而页面只报一个 404。
   *
   * 第三个参数不能只拿 expect.anything() 兜住：手写的 Content-Type 会把
   * multipart 的 boundary 一起写死，服务端解析不出字段 —— 这条约束必须能被打红。
   */
  it("走 PUT /gallery/{id}，不是已经摘掉的 PATCH 或 /replace，也不手写 Content-Type", () => {
    const formData = new FormData();

    commitGalleryMedia(7, formData);

    expect(request.put).toHaveBeenCalledWith("/gallery/7", formData, expect.anything());
    const headers = request.put.mock.calls[0][2]?.headers ?? {};
    expect(Object.keys(headers).map((name) => name.toLowerCase())).not.toContain("content-type");
  });

  /** 保存也要能取消：中途取消要能中止在途请求 */
  it("把进度回调与取消信号透传给 axios", () => {
    const formData = new FormData();
    const onUploadProgress = () => {};
    const controller = new AbortController();

    commitGalleryMedia(7, formData, onUploadProgress, controller.signal);

    expect(request.put).toHaveBeenCalledWith("/gallery/7", formData, {
      onUploadProgress,
      signal: controller.signal,
    });
  });
});
