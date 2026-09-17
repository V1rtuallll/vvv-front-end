import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/blog/api/blogApi", () => ({ getLatestBlogs: vi.fn() }));

import { getLatestBlogs } from "@/modules/blog/api/blogApi";
import { useLatestBlogs } from "@/modules/blog/composables/useLatestBlogs";

async function mountRail() {
  let api;
  mount({
    setup() {
      api = useLatestBlogs();
      return () => null;
    },
  });
  await flushPromises();
  return api;
}

describe("useLatestBlogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLatestBlogs.mockResolvedValue({
      data: [
        { id: 1, title: "第一篇", summary: "摘要一", createdAt: "2026-09-17T10:00:00" },
        { id: 2, title: "第二篇", summary: "摘要二", createdAt: "2026-09-16T10:00:00" },
      ],
    });
  });

  it("挂载即按 5 条加载", async () => {
    const api = await mountRail();

    expect(getLatestBlogs).toHaveBeenCalledWith({ limit: 5 });
    expect(api.blogs.value).toHaveLength(2);
    expect(api.blogs.value[0].title).toBe("第一篇");
  });

  it("后端没给数据时是空列表，不是 undefined", async () => {
    getLatestBlogs.mockResolvedValue({ data: null });

    const api = await mountRail();

    expect(api.blogs.value).toEqual([]);
  });

  it("加载失败不提交状态，也不重复弹提示", async () => {
    getLatestBlogs.mockRejectedValue(new Error("boom"));

    const api = await mountRail();

    expect(api.blogs.value).toEqual([]);
    // 提示由 request.js 负责（这是全局布局，别让每个页面都多弹一条）
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });
});
