import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/about/api/aboutApi", () => ({ getAbout: vi.fn() }));

import { getAbout } from "@/modules/about/api/aboutApi";
import AboutContent from "@/views/about/components/AboutContent.vue";
import AboutPage from "@/views/about/index.vue";

function payload(overrides = {}) {
  return {
    data: {
      avatarSrc: "",
      displayName: "",
      tagline: "",
      bioHtml: "",
      links: [],
      tags: [],
      ...overrides,
    },
  };
}

async function mountAbout(overrides) {
  getAbout.mockResolvedValue(payload(overrides));
  const wrapper = mount(AboutPage);
  await flushPromises();
  return wrapper;
}

describe("About 页面", () => {
  beforeEach(() => {
    getAbout.mockResolvedValue(payload());
  });

  it("什么都没填时显示中性占位文案", async () => {
    const wrapper = await mountAbout();

    expect(wrapper.find(".about-empty").text()).toBe("这里还没有内容");
  });

  it("加载中显示占位，且此时不显示空文案", async () => {
    let resolve;
    getAbout.mockReturnValue(new Promise((r) => { resolve = r; }));

    const wrapper = mount(AboutPage);

    expect(wrapper.find(".about-loading").exists()).toBe(true);
    expect(wrapper.find(".about-empty").exists()).toBe(false);

    resolve(payload({ displayName: "V1rtual" }));
    await flushPromises();

    expect(wrapper.find(".about-loading").exists()).toBe(false);
  });

  it("加载失败不重复弹提示", async () => {
    getAbout.mockRejectedValue(new Error("boom"));

    const wrapper = mount(AboutPage);
    await flushPromises();

    // 提示由 request.js 负责
    expect(window.$vmessage.error).not.toHaveBeenCalled();
    expect(wrapper.find(".about-empty").exists()).toBe(true);
  });

  it("有内容时渲染 AboutContent 组件", async () => {
    const wrapper = await mountAbout({ displayName: "V1rtual", bioHtml: "<p>正文</p>" });

    expect(wrapper.findComponent(AboutContent).exists()).toBe(true);
    expect(wrapper.find(".about-empty").exists()).toBe(false);
  });
});
