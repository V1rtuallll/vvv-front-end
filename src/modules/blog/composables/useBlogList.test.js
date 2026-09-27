import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/modules/blog/api/blogApi", () => ({
  getBlogList: vi.fn(),
}));

import { getBlogList } from "@/modules/blog/api/blogApi";
import { useBlogList } from "@/modules/blog/composables/useBlogList";
import { useAuthStore } from "@/stores/auth";

/** 挂载列表。装真路由：页码与地址栏是双向绑定的，替身模拟不出这一点 */
async function mountList(path = "/blog") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/blog", component: { template: "<div />" } }],
  });
  await router.push(path);
  await router.isReady();

  let api;
  mount(
    { setup() { api = useBlogList(); return () => null; } },
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return { api, router };
}

describe("useBlogList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: { id: 7, username: "u7" }, token: "t", isLoggedIn: true });
    getBlogList.mockResolvedValue({ data: { list: [{ id: 1, title: "第一篇" }], total: 21 } });
  });

  it("挂载即按第一页 6 条加载", async () => {
    const { api } = await mountList();

    expect(getBlogList).toHaveBeenCalledWith({ page: 1, limit: 6 });
    expect(api.blogs.value).toHaveLength(1);
    expect(api.total.value).toBe(21);
  });

  it("总数算出总页数", async () => {
    const { api } = await mountList();

    // 总数 21、每页 6 条 —— 改了页大小这个数就得跟着走
    expect(api.totalPages.value).toBe(4);
  });

  it("地址里带着页码时直接落在那一页", async () => {
    const { api } = await mountList("/blog?page=3");

    expect(getBlogList).toHaveBeenCalledWith({ page: 3, limit: 6 });
    expect(api.page.value).toBe(3);
  });

  it("翻页带上新页码重新请求，并把页码写进地址", async () => {
    const { api, router } = await mountList();

    api.changePage(2);
    await flushPromises();

    expect(getBlogList).toHaveBeenLastCalledWith({ page: 2, limit: 6 });
    expect(router.currentRoute.value.query.page).toBe("2");
  });

  it("越界的页码不触发请求", async () => {
    const { api } = await mountList();
    getBlogList.mockClear();

    api.changePage(0);
    api.changePage(9);
    await flushPromises();

    expect(getBlogList).not.toHaveBeenCalled();
  });

  it("地址里的页码超出现有页数时收敛到最后一页，不留空白页", async () => {
    const { api, router } = await mountList("/blog?page=9");

    expect(getBlogList).toHaveBeenLastCalledWith({ page: 4, limit: 6 });
    expect(api.page.value).toBe(4);
    expect(router.currentRoute.value.query.page).toBe("4");
  });

  it("非法页码当第一页处理", async () => {
    const { api } = await mountList("/blog?page=abc");

    expect(getBlogList).toHaveBeenCalledWith({ page: 1, limit: 6 });
    expect(api.page.value).toBe(1);
  });

  it("加载失败不提交状态，也不重复弹提示", async () => {
    getBlogList.mockRejectedValue(new Error("boom"));

    const { api } = await mountList();

    expect(api.blogs.value).toEqual([]);
    expect(api.total.value).toBe(0);
    expect(api.loading.value).toBe(false);
    // 提示由 request.js 负责
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });
});
