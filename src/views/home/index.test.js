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
      latestBlogs: ref([]),
      pinnedBlog: ref(null),
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
