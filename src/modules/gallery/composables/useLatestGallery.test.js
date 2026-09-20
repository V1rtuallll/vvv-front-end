import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/gallery/api/galleryApi", () => ({ getGalleryPage: vi.fn() }));

import { getGalleryPage } from "@/modules/gallery/api/galleryApi";
import { useLatestGallery } from "@/modules/gallery/composables/useLatestGallery";

async function mountRail() {
  let api;
  mount({
    setup() {
      api = useLatestGallery();
      return () => null;
    },
  });
  await flushPromises();
  return api;
}

describe("useLatestGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGalleryPage.mockResolvedValue({
      data: {
        list: [
          { id: 3, type: "photo", title: "第三张", src: "https://cdn/a.png" },
          { id: 2, type: "gif", title: "第二张", src: "https://cdn/b.gif" },
        ],
        total: 2,
      },
    });
  });

  it("挂载即取第一页（后端按创建时间倒序），窗口开得比 3 大是为了筛完还有 3 条", async () => {
    const api = await mountRail();

    expect(getGalleryPage).toHaveBeenCalledWith({ page: 1, limit: 12 });
    expect(api.items.value).toHaveLength(2);
    expect(api.items.value[0].src).toBe("https://cdn/a.png");
  });

  it("音乐不进网格，筛完最多留 5 条", async () => {
    getGalleryPage.mockResolvedValue({
      data: {
        list: [
          { id: 8, type: "music", src: "https://cdn/h.mp3" },
          { id: 7, type: "photo", src: "https://cdn/g.png" },
          { id: 6, type: "music", src: "https://cdn/f.mp3" },
          { id: 5, type: "video", src: "https://cdn/e.mp4" },
          { id: 4, type: "gif", src: "https://cdn/d.gif" },
          { id: 3, type: "photo", src: "https://cdn/c.png" },
        ],
        total: 6,
      },
    });

    const api = await mountRail();

    // 音乐确实可能出现在 gallery 表里（画廊上传接受音频），右栏只是不展示
    // 上限提到 5 后，第 3 条非音乐（id=3）也补位进来
    expect(api.items.value.map((item) => item.id)).toEqual([7, 5, 4, 3]);
  });

  it("后端没给数据时是空列表，不是 undefined", async () => {
    getGalleryPage.mockResolvedValue({ data: null });

    const api = await mountRail();

    expect(api.items.value).toEqual([]);
  });

  it("加载失败不提交状态，也不重复弹提示", async () => {
    getGalleryPage.mockRejectedValue(new Error("boom"));

    const api = await mountRail();

    expect(api.items.value).toEqual([]);
    // 提示由 request.js 负责（这是全局布局，别让每个页面都多弹一条）
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });
});
