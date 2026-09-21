import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/home/composables/useHomeContent", async () => {
  const { ref } = await import("vue");

  const mainItem = ref({
    type: "photo",
    src: "/main.jpg",
    title: "主展示标题",
    description: "主展示描述",
    uploaderUsername: "uploader",
    random: true,
    inGallery: true,
  });
  const galleryItems = ref([
    {
      id: 1,
      type: "photo",
      src: "/masonry.jpg",
      title: "拼图标题",
      description: "拼图描述",
      showInfo: false,
    },
    {
      id: 2,
      type: "video",
      src: "/masonry-2.mp4",
      title: "拼图标题二",
      description: "拼图描述二",
      showInfo: false,
    },
  ]);

  return {
    useHomeContent: () => ({
      mainItem,
      galleryItems,
      showInfo: ref(false),
      formatShortDate: () => "2026/9/12",
      changeRandom: vi.fn(),
    }),
  };
});

vi.mock("vue-router", () => ({ useRouter: vi.fn() }));

import { useRouter } from "vue-router";
import { useHomeContent } from "@/modules/home/composables/useHomeContent";
import HomePage from "@/views/home/index.vue";

const stubHover = (matches) => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches })));
};

const galleryItemsOf = () => useHomeContent().galleryItems.value;

describe("Home 页面信息栏", () => {
  beforeEach(() => {
    useHomeContent().showInfo.value = false;
    galleryItemsOf().forEach((item) => {
      item.showInfo = false;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("触屏设备上主展示信息栏无需 hover 即可见", () => {
    stubHover(false);

    const wrapper = mount(HomePage);

    expect(wrapper.find(".showcase-info-bottom").exists()).toBe(true);
    expect(wrapper.find(".uploader-name").text()).toContain("uploader");
  });

  it("画廊渲染列表里的每一张卡，每张都带顶部条、信息栏和底部条", async () => {
    stubHover(true);

    const wrapper = mount(HomePage);
    const cards = wrapper.findAll(".masonry-item");

    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      expect(card.find(".masonry-head").exists()).toBe(true);
      expect(card.find(".masonry-foot").exists()).toBe(true);
      expect(card.find(".gallery-info-bottom").exists()).toBe(true);
    });
  });

  it("画廊信息栏常显，不依赖悬浮也不依赖点击", async () => {
    // 支持 hover 的设备
    stubHover(true);
    const hoverWrapper = mount(HomePage);
    expect(hoverWrapper.find(".masonry-item .gallery-info-bottom").exists()).toBe(true);

    // 触屏设备
    stubHover(false);
    const touchWrapper = mount(HomePage);
    expect(touchWrapper.find(".masonry-item .gallery-info-bottom").exists()).toBe(true);
  });

  it("只有资源确实在画廊里时才给「详情」入口", () => {
    stubHover(true);
    const withDetail = mount(HomePage);
    expect(withDetail.find(".detail-btn").exists()).toBe(true);

    // 类型表里有些素材从没进过画廊，对它们而言链接是死的，不该出现
    useHomeContent().mainItem.value = { ...useHomeContent().mainItem.value, inGallery: false };
    const without = mount(HomePage);
    expect(without.find(".detail-btn").exists()).toBe(false);
  });

  it("支持 hover 的设备上主展示信息栏也常显，「换一个」与上传信息同属左栏", () => {
    stubHover(true);

    const wrapper = mount(HomePage);

    expect(wrapper.find(".showcase-info-bottom").exists()).toBe(true);
    // 按钮和头像、用户名同在 .uploader-left 里，不另起一行
    expect(wrapper.find(".uploader-left .change-btn").exists()).toBe(true);
  });
});

describe("Home 主展示媒体", () => {
  const 原始主项 = () => ({
    type: "photo",
    src: "/main.jpg",
    title: "主展示标题",
    description: "主展示描述",
    uploaderUsername: "uploader",
  });

  beforeEach(() => {
    useHomeContent().mainItem.value = {
      type: "video",
      src: "/main.mp4",
      title: "主展示视频",
    };
  });

  afterEach(() => {
    useHomeContent().mainItem.value = 原始主项();
    vi.unstubAllGlobals();
  });

  /**
   * 主展示视频自动播放（**不静音**，按用户要求）。
   *
   * 代价已知：用户交互前浏览器会拦下这次 autoplay；交互后它会满音量起播，
   * 而侧栏播放器不会让位，两路会同时响。取消 muted 是用户的选择，不是疏漏。
   */
  it("主展示视频自动播放且不静音，并保留原生控件", () => {
    stubHover(true);

    const wrapper = mount(HomePage);
    const video = wrapper.find("video.showcase-media");

    expect(video.exists()).toBe(true);
    // autoplay / muted 在 jsdom 里的落点不稳定 —— 可能被写进 property，
    // 也可能留在属性上（muted 不是标准的反射属性）。两个都认，
    // 断言的是「确实会静音自动起播」这个行为，而不是它落在哪一层
    const el = video.element;
    expect(el.autoplay === true || el.hasAttribute("autoplay")).toBe(true);
    // 显式断言「没有被静音」—— 去掉 muted 是刻意的，别被顺手加回来
    expect(el.muted === true || el.hasAttribute("muted")).toBe(false);
    expect(el.hasAttribute("controls") || el.controls === true).toBe(true);
  });
});

describe("Home 拼图卡进详情", () => {
  it("点击拼图卡跳转到画廊详情，带上该条目的 id", async () => {
    stubHover(true);
    const push = vi.fn();
    useRouter.mockReturnValue({ push });

    const wrapper = mount(HomePage);
    // 点第二张卡：断言取的是条目自己的主键，不是列表序号
    await wrapper.findAll(".masonry-item")[1].trigger("click");

    expect(push).toHaveBeenCalledWith({ path: "/gallery", query: { id: 2 } });
  });

  it("键盘 Enter 与点击等价", async () => {
    stubHover(true);
    const push = vi.fn();
    useRouter.mockReturnValue({ push });

    const wrapper = mount(HomePage);
    await wrapper.findAll(".masonry-item")[0].trigger("keydown.enter");

    expect(push).toHaveBeenCalledWith({ path: "/gallery", query: { id: 1 } });
  });
});
