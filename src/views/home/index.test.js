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

  it("触屏设备上点击拼图项切换信息栏", async () => {
    stubHover(false);

    const wrapper = mount(HomePage);
    const tile = wrapper.find(".masonry-item");

    expect(wrapper.find(".gallery-info-bottom").exists()).toBe(false);

    await tile.trigger("click");
    expect(wrapper.find(".gallery-info-bottom").exists()).toBe(true);

    await tile.trigger("click");
    expect(wrapper.find(".gallery-info-bottom").exists()).toBe(false);
  });

  it("触屏设备上合成的 mouseenter 不会把点击切换抵消掉", async () => {
    stubHover(false);

    const wrapper = mount(HomePage);
    const tile = wrapper.find(".masonry-item");

    await tile.trigger("mouseenter");
    expect(wrapper.find(".gallery-info-bottom").exists()).toBe(false);

    await tile.trigger("click");
    expect(wrapper.find(".gallery-info-bottom").exists()).toBe(true);
  });

  it("支持 hover 的设备保持原有行为：信息栏初始隐藏，鼠标移入才显示", async () => {
    stubHover(true);

    const wrapper = mount(HomePage);

    expect(wrapper.find(".showcase-info-bottom").exists()).toBe(false);
    expect(wrapper.find(".gallery-info-bottom").exists()).toBe(false);

    await wrapper.find(".masonry-item").trigger("mouseenter");
    expect(wrapper.find(".gallery-info-bottom").exists()).toBe(true);
  });

  it("支持 hover 的设备上点击拼图项不切换信息栏", async () => {
    stubHover(true);

    const wrapper = mount(HomePage);
    const tile = wrapper.find(".masonry-item");

    await tile.trigger("click");

    expect(wrapper.find(".gallery-info-bottom").exists()).toBe(false);
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
