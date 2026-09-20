import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

async function mountPage() {
  const wrapper = mount(BlogPage, { global: { stubs } });
  await flushPromises();
  return wrapper;
}

describe("Blog 列表页", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn(false);
    getBlogList.mockResolvedValue({ data: { list: [{ id: 1, title: "第一篇", summary: "摘要" }], total: 1 } });
  });

  it("未登录没有写作入口，登录后有且指向编辑器", async () => {
    expect((await mountPage()).find(".blog-write-btn").exists()).toBe(false);

    signIn(true);
    expect((await mountPage()).find(".blog-write-btn").attributes("href")).toBe("/blog/editor");
  });

  it("卡片链接指向详情页", async () => {
    const wrapper = await mountPage();

    expect(wrapper.find(".blog-card-link").attributes("href")).toBe("/blog/detail/1");
  });

  it("没有文章时显示空态", async () => {
    getBlogList.mockResolvedValue({ data: { list: [], total: 0 } });

    expect((await mountPage()).find(".blog-empty").text()).toBe("暂无文章");
  });

  it("只有一页时两个翻页按钮都不可用", async () => {
    const wrapper = await mountPage();
    const buttons = wrapper.findAll(".bottom-pagination .crt-mini-btn");

    expect(buttons).toHaveLength(2);
    expect(buttons[0].attributes("disabled")).toBeDefined();
    expect(buttons[1].attributes("disabled")).toBeDefined();
  });
});
