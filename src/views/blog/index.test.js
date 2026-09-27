import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/modules/blog/api/blogApi", () => ({ getBlogList: vi.fn() }));

import { getBlogList } from "@/modules/blog/api/blogApi";
import { useAuthStore } from "@/stores/auth";
import BlogPage from "@/views/blog/index.vue";

const stubs = {
  "router-link": { props: ["to"], template: '<a :href="to"><slot /></a>' },
};

function signIn(isLoggedIn) {
  useAuthStore.mockReturnValue({
    user: isLoggedIn ? { id: 7, username: "u7" } : null,
    token: isLoggedIn ? "t" : null,
    isLoggedIn,
  });
}

/** 挂载页面。装真路由：页码要写进 ?page=，替身模拟不出地址变化 */
async function mountPage(path = "/blog") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/blog", component: { template: "<div />" } }],
  });
  await router.push(path);
  await router.isReady();

  const wrapper = mount(BlogPage, { global: { plugins: [router], stubs } });
  await flushPromises();
  return { wrapper, router };
}

/** 页码条上的数字按钮 */
const pageButtons = (wrapper) => wrapper.findAll(".page-numbers button");

describe("Blog 列表页", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn(false);
    getBlogList.mockResolvedValue({ data: { list: [{ id: 1, title: "第一篇", summary: "摘要" }], total: 1 } });
  });

  it("未登录没有写作入口，登录后有且指向编辑器", async () => {
    expect((await mountPage()).wrapper.find(".list-action").exists()).toBe(false);

    signIn(true);
    expect((await mountPage()).wrapper.find(".list-action").attributes("href")).toBe("/blog/editor");
  });

  /** 页头是 blog 与 gallery 共用的那一个，两边不该再各长各的 */
  it("页头用共用组件：标题加小字说明", async () => {
    const { wrapper } = await mountPage();

    expect(wrapper.find(".list-title").text()).toBe("Blog");
    expect(wrapper.find(".list-subtitle").text()).toBe("Share ur opinion.");
  });

  it("卡片链接指向详情页", async () => {
    const { wrapper } = await mountPage();

    expect(wrapper.find(".blog-card-link").attributes("href")).toBe("/blog/detail/1");
  });

  it("没有文章时显示空态", async () => {
    getBlogList.mockResolvedValue({ data: { list: [], total: 0 } });

    expect((await mountPage()).wrapper.find(".blog-empty").text()).toBe("暂无文章");
  });

  it("把页码渲染成可点的按钮", async () => {
    getBlogList.mockResolvedValue({ data: { list: [], total: 21 } });

    const { wrapper } = await mountPage();

    expect(pageButtons(wrapper).map((button) => button.text())).toEqual(["1", "2", "3", "4"]);
  });

  it("点页码翻到那一页，并把页码写进地址", async () => {
    getBlogList.mockResolvedValue({ data: { list: [], total: 21 } });
    const { wrapper, router } = await mountPage();

    await pageButtons(wrapper)[2].trigger("click");
    await flushPromises();

    expect(getBlogList).toHaveBeenLastCalledWith({ page: 3, limit: 6 });
    expect(router.currentRoute.value.query.page).toBe("3");
  });

  it("只有一页时两个翻页按钮都不可用", async () => {
    const { wrapper } = await mountPage();
    const steps = wrapper.findAll(".bottom-pagination .page-step");

    expect(steps).toHaveLength(2);
    expect(steps[0].attributes("disabled")).toBeDefined();
    expect(steps[1].attributes("disabled")).toBeDefined();
  });
});
