import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import request from "@/utils/request";
import { getGalleryBgmCandidates, uploadGalleryBgm } from "@/modules/gallery/api/galleryApi";

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
