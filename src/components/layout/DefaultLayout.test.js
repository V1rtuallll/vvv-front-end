import { readFileSync } from "node:fs";
import { join } from "node:path";

import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));

vi.mock("@/modules/user/api/userApi", () => ({
  getUserCount: vi.fn().mockResolvedValue({ data: 1 }),
  getUserStats: vi.fn().mockResolvedValue({
    data: { galleryCount: 12, galleryLikes: 48, blogCount: 3, blogViews: 36 },
  }),
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
import { useAuthStore } from "@/stores/auth";
import DefaultLayout from "@/components/layout/DefaultLayout.vue";

// 每个用例都从「未登录」起手：ID 卡的默认形态是未登录，
// 需要登录态的用例自己在 mount 前重新 mockReturnValue
beforeEach(() => {
  useAuthStore.mockReturnValue({ isLoggedIn: false, user: null });
});

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

  // 编号与统计各自占一格：编号在右上角，统计在左下角。
  // 曾经两者共用一个右列容器，长摘要撑破网格后整个右列被顶到卡片外
  it("编号与统计是链接的直接子项，不共用右列容器", async () => {
    const wrapper = await mountLayout();
    await flush();

    const link = wrapper.find(".right .top-list .top-link");
    expect(link.find(".top-side").exists()).toBe(false);

    const direct = Array.from(link.element.children).map((el) => el.classList);
    expect(direct.some((c) => c.contains("top-id"))).toBe(true);
    expect(direct.some((c) => c.contains("top-stats"))).toBe(true);
  });

  // jsdom 不做布局，溢出与否量不出来，这条守的是那次修复本身：
  // 中间列不声明 min-width: 0，摘要里整段没有空格的连续字符会按最小宽度
  // 把网格撑开，第三列（编号）就跑到卡片外
  it("卡片中间列声明了 min-width: 0，长串摘要撑不破网格", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/layout/DefaultLayout.css"),
      "utf8"
    );
    const rule = css.match(/\.right \.top-list \.top-link-text \{[^}]*\}/);

    expect(rule).not.toBeNull();
    expect(rule[0]).toContain("min-width: 0");
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

  it("五条都带上各自的 id 指向画廊页，图片与视频都显示画面", async () => {
    const wrapper = await mountLayout();
    await flush();

    const cells = wrapper.findAll(".right .gallery-rows a");
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

  // ◀ ▶ ■ 这类几何字符在 iOS/Safari 上会被渲染成彩色 emoji
  it("三个控制按钮用矢量图标，里面没有字符", async () => {
    const wrapper = await mountLayout();

    const controls = wrapper.find(".player-controls");
    expect(controls.findAll("button")).toHaveLength(3);
    expect(controls.text()).toBe("");
    expect(controls.find(".ui-icon-prev").exists()).toBe(true);
    expect(controls.find(".ui-icon-play").exists()).toBe(true);
    expect(controls.find(".ui-icon-next").exists()).toBe(true);
  });

  describe("侧栏底部 ID 卡", () => {
    it("未登录时大小不变，显示空头像和登录/注册入口", () => {
      const wrapper = mount(DefaultLayout, { global: { stubs, plugins: [router] } });

      const card = wrapper.find(".id-card");
      expect(card.exists()).toBe(true);
      expect(card.find(".id-card-avatar-empty").exists()).toBe(true);
      expect(card.find(".id-card-name").text()).toBe("未登录");
      expect(card.find(".id-card-actions").exists()).toBe(true);

      const hrefs = card.findAll(".id-card-btn").map((a) => a.attributes("href"));
      expect(hrefs).toEqual(["/login", "/register"]);
    });

    it("已登录时渲染四项战绩，数值来自 /user/stats", async () => {
      useAuthStore.mockReturnValue({
        isLoggedIn: true,
        user: { id: 7, username: "V1rtual", avatar: "/a.png" },
      });

      const wrapper = mount(DefaultLayout, { global: { stubs, plugins: [router] } });
      await flushPromises();

      const nums = wrapper.findAll(".id-card-stat-num").map((e) => e.text());
      const labels = wrapper.findAll(".id-card-stat-label").map((e) => e.text());
      expect(labels).toEqual(["画廊", "获赞", "文章", "阅读"]);
      expect(nums).toEqual(["12", "48", "3", "36"]);
    });

    it("未登录时不渲染战绩格", () => {
      const wrapper = mount(DefaultLayout, { global: { stubs, plugins: [router] } });

      expect(wrapper.find(".id-card-stats").exists()).toBe(false);
    });

    it("已登录时显示头像、用户名和真实 ID", () => {
      useAuthStore.mockReturnValue({
        isLoggedIn: true,
        user: { id: 7, username: "V1rtual", avatar: "/a.png" },
      });

      const wrapper = mount(DefaultLayout, { global: { stubs, plugins: [router] } });

      const card = wrapper.find(".id-card");
      expect(card.find(".id-card-avatar").attributes("src")).toBe("/a.png");
      expect(card.find(".id-card-name").text()).toBe("V1rtual");
      expect(card.find(".id-card-no").text()).toBe("ID #007");
      // 登录态不该再出现登录/注册入口
      expect(card.find(".id-card-actions").exists()).toBe(false);
    });
  });
});

/**
 * 抽屉按钮固定在视口右上角，不滚时它盖住的是页头，无所谓；一滚起来它就一直
 * 压着滚到那里的内容（实测会盖住首页展示区的「换一个」按钮）。滚过阈值后
 * 给布局加 is-scrolled，由 CSS 把按钮调淡。
 */
describe("抽屉按钮的滚动淡出", () => {
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

  /** jsdom 里 scrollY 是只读的 getter，要摆值只能重新定义 */
  const setScrollY = (value) =>
    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value });

  const scrollTo = async (value) => {
    setScrollY(value);
    window.dispatchEvent(new Event("scroll"));
    // 状态写在 rAF 回调里，等这一帧跑完再看 DOM
    await nextFrame();
    await flush();
  };

  it("滚过阈值加上 is-scrolled，回到顶部再移除", async () => {
    const wrapper = await mountLayout();
    const layout = wrapper.find(".vf-layout");

    await scrollTo(0);
    expect(layout.classes()).not.toContain("is-scrolled");

    await scrollTo(120);
    expect(layout.classes()).toContain("is-scrolled");

    await scrollTo(0);
    expect(layout.classes()).not.toContain("is-scrolled");
  });

  it("没到阈值不淡出", async () => {
    const wrapper = await mountLayout();

    await scrollTo(40);

    expect(wrapper.find(".vf-layout").classes()).not.toContain("is-scrolled");
  });

  it("卸载时移除 window 上的 scroll 监听", async () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    await mountLayout();
    // 等播放器的异步挂载跑完再卸：它 onMounted 里先 await nextTick()，
    // 抢在那一拍之前卸载会让它去读已经为 null 的 ref
    await flush();

    wrapper.unmount();
    // 已经卸过了，别让 afterEach 再卸一次
    wrapper = undefined;

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
