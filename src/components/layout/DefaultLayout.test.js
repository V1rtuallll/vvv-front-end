import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/user/api/userApi", () => ({
  getUserCount: vi.fn().mockResolvedValue({ data: 1 }),
}));

vi.mock("@/modules/blog/api/blogApi", () => ({
  getLatestBlogs: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("@/modules/gallery/api/galleryApi", () => ({
  getGalleryPage: vi.fn().mockResolvedValue({ data: { list: [], total: 0 } }),
}));

// 刻意不 mock useAudioPlayer。原文件把它整体换成了空 ref，那恰好会掩盖
// 「给侧栏加 v-if 导致播放器全端失效」这个回归 —— 空 ref 让播放器的
// onMounted 逻辑永远不会真正执行。已实测：真实 composable 在 jsdom 里
// 挂载正常，不会抛异常，因此这里直接用真的，守卫用例才有意义。
import { getLatestBlogs } from "@/modules/blog/api/blogApi";
import { getGalleryPage } from "@/modules/gallery/api/galleryApi";
import DefaultLayout from "@/components/layout/DefaultLayout.vue";

const stubs = {
  // 真 router-link 要求目标路由已注册，这里只把 to 渲染成 href。
  // 对象形式（带 query）拼成 path?query，断言才看得到真实地址。
  "router-link": {
    props: ["to"],
    template: '<a :href="href"><slot /></a>',
    computed: {
      href() {
        const to = this.to;
        if (typeof to === "string") return to;
        const query = Object.entries(to.query || {})
          .map(([key, value]) => `${key}=${value}`)
          .join("&");
        return query ? `${to.path}?${query}` : to.path;
      },
    },
  },
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

describe("顶部导航栏", () => {
  it("有 About 入口，指向 /about", async () => {
    const wrapper = await mountLayout();

    const links = wrapper
      .findAll(".vf-navbar-tabs a")
      .map((a) => [a.text(), a.attributes("href")]);

    expect(links).toContainEqual(["About", "/about"]);
  });

  it("五个入口的顺序固定", async () => {
    const wrapper = await mountLayout();

    const labels = wrapper.findAll(".vf-navbar-tabs a").map((a) => a.text());

    expect(labels).toEqual(["Home", "Profile", "Blogs", "Gallery", "About"]);
  });

  it("有 Blog 入口，指向 /blog", async () => {
    const wrapper = await mountLayout();

    const links = wrapper
      .findAll(".vf-navbar-tabs a")
      .map((a) => [a.text(), a.attributes("href")]);

    expect(links).toContainEqual(["Blogs", "/blog"]);
  });
});

describe("播放器抽屉", () => {
  beforeEach(async () => {
    wrapper = await mountLayout();
  });

  it("初始收起，右侧栏仍在 DOM 中", () => {
    expect(wrapper.find(".sidebar.right").classes()).not.toContain("is-open");
    expect(wrapper.find(".sidebar.right").exists()).toBe(true);
  });

  it("点播放器按钮展开抽屉", async () => {
    await wrapper.find(".drawer-toggle.player").trigger("click");

    expect(wrapper.find(".sidebar.right").classes()).toContain("is-open");
  });

  it("再点同一个按钮收起", async () => {
    await wrapper.find(".drawer-toggle.player").trigger("click");
    await wrapper.find(".drawer-toggle.player").trigger("click");

    expect(wrapper.find(".sidebar.right").classes()).not.toContain("is-open");
  });

  it("按钮的 aria-expanded 随开合变化", async () => {
    const toggle = wrapper.find(".drawer-toggle.player");
    expect(toggle.attributes("aria-expanded")).toBe("false");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
  });

  it("点遮罩关闭", async () => {
    await wrapper.find(".drawer-toggle.player").trigger("click");
    expect(wrapper.find(".sidebar.right").classes()).toContain("is-open");

    await wrapper.find(".drawer-backdrop").trigger("click");

    expect(wrapper.find(".sidebar.right").classes()).not.toContain("is-open");
  });

  it("路由变化时关闭", async () => {
    await wrapper.find(".drawer-toggle.player").trigger("click");
    expect(wrapper.find(".sidebar.right").classes()).toContain("is-open");

    await router.push("/gallery");
    await flush();

    expect(wrapper.find(".sidebar.right").classes()).not.toContain("is-open");
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

  it("渲染 5 条，整行都是指向详情页的链接", async () => {
    const wrapper = await mountLayout();
    await flush();

    const items = wrapper.findAll(".right .top-list li");
    expect(items).toHaveLength(5);
    expect(items[0].find("a").attributes("href")).toBe("/blog/detail/1");
    expect(items[0].find("a").text()).toContain("第一篇");
    // 摘要也在链接里。放在链接外时它看着像链接却点不动
    expect(items[0].find("a .top-summary").text()).toBe("摘要一");
    // li 的直接子元素只有那一个 <a>，整行都归它管
    expect(items[0].element.children).toHaveLength(1);
    expect(items[0].element.children[0].tagName).toBe("A");
  });

  it("右栏区块有标题 Blogs，且没有硬编码的假数据", async () => {
    const wrapper = await mountLayout();
    await flush();
    expect(wrapper.findAll(".right h3").map((h) => h.text())).toContain("Blogs");
    expect(wrapper.find(".right .top-list").text()).not.toContain("DarkAngel");
    expect(wrapper.find(".right .top-list").text()).not.toContain("BloodRose");
  });
});

describe("右栏最新画廊", () => {
  beforeEach(() => {
    getGalleryPage.mockResolvedValue({
      data: {
        list: [
          { id: 3, type: "photo", title: "第三张", src: "https://cdn/3.png" },
          { id: 2, type: "gif", title: "第二张", src: "https://cdn/2.gif" },
          { id: 1, type: "video", title: "第一支", src: "https://cdn/1.mp4" },
        ],
        total: 3,
      },
    });
  });

  it("取画廊列表第一页，窗口比 3 大：音乐要筛掉，筛完才凑得齐 3 格", async () => {
    await mountLayout();
    await flush();

    expect(getGalleryPage).toHaveBeenCalledWith({ page: 1, limit: 12 });
  });

  it("三条都带上各自的 id 指向画廊页，图片与视频都显示画面", async () => {
    const wrapper = await mountLayout();
    await flush();

    const cells = wrapper.findAll(".right .gallery-grid a");
    expect(cells).toHaveLength(3);
    // 带上 id，画廊页才能直接把这一条的详情弹出来
    expect(cells.map((cell) => cell.attributes("href"))).toEqual([
      "/gallery?id=3",
      "/gallery?id=2",
      "/gallery?id=1",
    ]);
    expect(cells[0].find("img").attributes("src")).toBe("https://cdn/3.png");
    expect(cells[0].find("img").attributes("alt")).toBe("第三张");
    // 视频的 src 塞进 img 只会得到破图，所以这一格是 video 元素而不是类型名文本
    expect(cells[2].find("img").exists()).toBe(false);
    expect(cells[2].find(".gallery-type").exists()).toBe(false);
    // preload=metadata 才拿得到首帧；默认值在部分浏览器会连整个文件一起下
    expect(cells[2].find("video").attributes("preload")).toBe("metadata");
    expect(cells[2].find("video").attributes("src")).toBe("https://cdn/1.mp4");
  });

  it("Imgs 贴纸与那行小字已经撤掉", async () => {
    const wrapper = await mountLayout();
    await flush();

    const right = wrapper.find(".right");
    expect(right.find(".friends-grid").exists()).toBe(false);
    expect(right.text()).not.toContain("我称此为");
    expect(wrapper.findAll(".right h3").map((h) => h.text())).not.toContain("Imgs");
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
    // 导航已从左栏抽屉移到顶部 tab 栏，同样必须常驻
    expect(wrapper.find(".vf-navbar-tabs a").exists()).toBe(true);
  });
});
