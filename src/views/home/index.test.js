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

  it("支持 hover 的设备上主展示信息栏仍是悬浮才显示", async () => {
    stubHover(true);

    const wrapper = mount(HomePage);

    expect(wrapper.find(".showcase-info-bottom").exists()).toBe(false);

    await wrapper.find(".main-showcase").trigger("mouseenter");
    expect(wrapper.find(".showcase-info-bottom").exists()).toBe(true);
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
   * 主展示视频默认暂停。
   *
   * 未静音的 autoplay 在用户交互前会被浏览器拦下，看上去没事；但用户一旦在站内
   * 点过任何东西，之后每次挂载（进出首页、换随机项、开新标签页）它都会真的自动
   * 满音量起播 —— 而侧栏的背景音乐是独立的一路、不会让位，
   * 同一段随机视频就会一层层叠着响。默认暂停后，要听必须自己点播放按钮。
   */
  it("主展示视频不自动播放，但保留原生控件", () => {
    stubHover(true);

    const wrapper = mount(HomePage);
    const video = wrapper.find("video.showcase-media");

    expect(video.exists()).toBe(true);
    expect(video.attributes("autoplay")).toBeUndefined();
    expect(video.attributes("controls")).toBeDefined();
  });
});
