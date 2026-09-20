import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/modules/blog/api/blogApi", () => ({
  getBlogList: vi.fn(),
}));

import { getBlogList } from "@/modules/blog/api/blogApi";
import { useBlogList } from "@/modules/blog/composables/useBlogList";
import { useAuthStore } from "@/stores/auth";

async function mountList() {
  let api;
  mount({
    setup() {
      api = useBlogList();
      return () => null;
    },
  });
  await flushPromises();
  return api;
}

describe("useBlogList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: { id: 7, username: "u7" }, token: "t", isLoggedIn: true });
    getBlogList.mockResolvedValue({ data: { list: [{ id: 1, title: "第一篇" }], total: 21 } });
  });

  it("挂载即按第一页 10 条加载", async () => {
    const api = await mountList();

    expect(getBlogList).toHaveBeenCalledWith({ page: 1, limit: 3 });
    expect(api.blogs.value).toHaveLength(1);
    expect(api.total.value).toBe(21);
  });

  it("总数算出总页数", async () => {
    const api = await mountList();

    // 总数 21、每页 3 条 —— 改了页大小这个数就得跟着走
    expect(api.totalPages.value).toBe(7);
  });

  it("翻页带上新页码重新请求", async () => {
    const api = await mountList();

    api.changePage(2);
    await flushPromises();

    expect(getBlogList).toHaveBeenLastCalledWith({ page: 2, limit: 3 });
  });

  it("越界的页码不触发请求", async () => {
    const api = await mountList();
    getBlogList.mockClear();

    api.changePage(0);
    api.changePage(9);
    await flushPromises();

    expect(getBlogList).not.toHaveBeenCalled();
  });

  it("加载失败不提交状态，也不重复弹提示", async () => {
    getBlogList.mockRejectedValue(new Error("boom"));

    const api = await mountList();

    expect(api.blogs.value).toEqual([]);
    expect(api.total.value).toBe(0);
    expect(api.loading.value).toBe(false);
    // 提示由 request.js 负责
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });
});
