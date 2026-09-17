import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/user/api/userApi", () => ({
  getUserCount: vi.fn().mockResolvedValue({ data: 1 }),
}));

vi.mock("@/modules/blog/api/blogApi", () => ({
  getLatestBlogs: vi.fn().mockResolvedValue({ data: [] }),
}));

// 刻意不 mock useAudioPlayer。原文件把它整体换成了空 ref，那恰好会掩盖
// 「给侧栏加 v-if 导致播放器全端失效」这个回归 —— 空 ref 让播放器的
// onMounted 逻辑永远不会真正执行。已实测：真实 composable 在 jsdom 里
// 挂载正常，不会抛异常，因此这里直接用真的，守卫用例才有意义。
import { getLatestBlogs } from "@/modules/blog/api/blogApi";
import DefaultLayout from "@/components/layout/DefaultLayout.vue";

const stubs = {
  "router-link": { props: ["to"], template: '<a :href="to"><slot /></a>' },
  "router-view": true,
};

const routes = [
  { path: "/home", component: { template: "<div />" } },
  { path: "/profile", component: { template: "<div />" } },
  { path: "/gallery", component: { template: "<div />" } },
  { path: "/about", component: { template: "<div />" } },
];

let router;
let wrapper;

async function mountLayout() {
  router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/home");
  await router.isReady();

  wrapper = mount(DefaultLayout, { global: { plugins: [router], stubs } });
  return wrapper;
}

// 卸载必须逐用例做：jsdom 环境在整个文件内共享，挂载过的组件会把
// useDrawer 注册的 keydown/resize 监听与 body 滚动锁留给下一个用例
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

// 去掉路由切换带来的异步：watch 默认在 pre 阶段刷新
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("左侧导航", () => {
  it("有 About 入口，指向 /about", async () => {
    const wrapper = await mountLayout();

    const links = wrapper.findAll(".vf-nav a").map((a) => [a.text(), a.attributes("href")]);

    expect(links).toContainEqual(["About", "/about"]);
  });

  it("左栏五个入口的顺序固定", async () => {
    const wrapper = await mountLayout();

    const labels = wrapper.findAll(".vf-nav a").map((a) => a.text());

    expect(labels).toEqual(["Home", "Profile", "Blogs", "Gallery", "About"]);
  });

  it("有 Blog 入口，指向 /blog", async () => {
    const wrapper = await mountLayout();

    const links = wrapper.findAll(".vf-nav a").map((a) => [a.text(), a.attributes("href")]);

    expect(links).toContainEqual(["Blogs", "/blog"]);
  });
});

describe("抽屉", () => {
  beforeEach(async () => {
    wrapper = await mountLayout();
  });

  it("初始全部收起，两个侧栏仍在 DOM 中", () => {
    expect(wrapper.find(".sidebar.left").classes()).not.toContain("is-open");
    expect(wrapper.find(".sidebar.right").classes()).not.toContain("is-open");
    expect(wrapper.find(".sidebar.left").exists()).toBe(true);
    expect(wrapper.find(".sidebar.right").exists()).toBe(true);
  });

  it("点导航按钮展开导航抽屉", async () => {
    await wrapper.find(".drawer-toggle.nav").trigger("click");

    expect(wrapper.find(".sidebar.left").classes()).toContain("is-open");
    expect(wrapper.find(".sidebar.right").classes()).not.toContain("is-open");
  });

  it("点播放器按钮展开播放器抽屉，导航自动收起", async () => {
    await wrapper.find(".drawer-toggle.nav").trigger("click");
    await wrapper.find(".drawer-toggle.player").trigger("click");

    expect(wrapper.find(".sidebar.right").classes()).toContain("is-open");
    expect(wrapper.find(".sidebar.left").classes()).not.toContain("is-open");
  });

  it("再点同一个按钮收起", async () => {
    await wrapper.find(".drawer-toggle.nav").trigger("click");
    await wrapper.find(".drawer-toggle.nav").trigger("click");

    expect(wrapper.find(".sidebar.left").classes()).not.toContain("is-open");
  });

  it("按钮的 aria-expanded 随开合变化", async () => {
    const toggle = wrapper.find(".drawer-toggle.nav");
    expect(toggle.attributes("aria-expanded")).toBe("false");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
  });

  it("点遮罩关闭", async () => {
    await wrapper.find(".drawer-toggle.nav").trigger("click");
    expect(wrapper.find(".sidebar.left").classes()).toContain("is-open");

    await wrapper.find(".drawer-backdrop").trigger("click");

    expect(wrapper.find(".sidebar.left").classes()).not.toContain("is-open");
  });

  it("路由变化时关闭", async () => {
    await wrapper.find(".drawer-toggle.nav").trigger("click");
    expect(wrapper.find(".sidebar.left").classes()).toContain("is-open");

    await router.push("/gallery");
    await flush();

    expect(wrapper.find(".sidebar.left").classes()).not.toContain("is-open");
  });
});

describe("右侧榜单", () => {
  beforeEach(() => {
    getLatestBlogs.mockResolvedValue({
      data: [
        { id: 1, title: "第一篇", summary: "摘要一", createdAt: "2026-09-17T10:00:00" },
        { id: 2, title: "第二篇", summary: "摘要二", createdAt: "2026-09-16T10:00:00" },
        { id: 3, title: "第三篇", summary: "摘要三", createdAt: "2026-09-15T10:00:00" },
        { id: 4, title: "第四篇", summary: "摘要四", createdAt: "2026-09-14T10:00:00" },
        { id: 5, title: "第五篇", summary: "摘要五", createdAt: "2026-09-13T10:00:00" },
      ],
    });
  });

  it("按 5 条请求最新博客", async () => {
    await mountLayout();
    await flush();

    expect(getLatestBlogs).toHaveBeenCalledWith({ limit: 5 });
  });

  it("渲染 5 条，标题链接指向详情页并带上摘要", async () => {
    const wrapper = await mountLayout();
    await flush();

    const items = wrapper.findAll(".right .top-list li");
    expect(items).toHaveLength(5);
    expect(items[0].find("a").text()).toBe("第一篇");
    expect(items[0].find("a").attributes("href")).toBe("/blog/detail/1");
    expect(items[0].text()).toContain("摘要一");
  });

  it("右栏区块有标题 Blogs，且没有硬编码的假数据", async () => {
    const wrapper = await mountLayout();
    await flush();

    expect(wrapper.findAll(".right h3").map((h) => h.text())).toContain("Blogs");
    expect(wrapper.find(".right .top-list").text()).not.toContain("DarkAngel");
    expect(wrapper.find(".right .top-list").text()).not.toContain("BloodRose");
  });
});

describe("播放器元素常驻", () => {
  // 守卫用例。针对一个会让播放器在所有分辨率下失效的改法：给侧栏或播放器
  // 加 v-if。useAudioPlayer 在 onMounted 里直接对 8 个 ref 取属性
  // （audio.volume = 0.3、playButton.addEventListener(...)），任何一个为
  // null 就抛异常。所以抽屉的显隐只能靠 CSS transform，元素必须常驻 DOM。
  it("抽屉收起时播放器元素仍在 DOM 中", async () => {
    const wrapper = await mountLayout();

    expect(wrapper.find(".music-player audio").exists()).toBe(true);
    expect(wrapper.find(".music-player .player-controls").exists()).toBe(true);
    expect(wrapper.find(".sidebar.left .vf-nav").exists()).toBe(true);
  });
});
