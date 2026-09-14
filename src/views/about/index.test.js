import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/about/api/aboutApi", () => ({ getAbout: vi.fn() }));

import { getAbout } from "@/modules/about/api/aboutApi";
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

  it("渲染昵称与签名", async () => {
    const wrapper = await mountAbout({ displayName: "V1rtual", tagline: "在代码与幻想之间游荡" });

    expect(wrapper.find(".about-name").text()).toBe("V1rtual");
    expect(wrapper.find(".about-tagline").text()).toBe("在代码与幻想之间游荡");
  });

  it("渲染正文并走白名单过滤", async () => {
    const wrapper = await mountAbout({ bioHtml: '<p>正文</p><script>alert(1)</script>' });

    expect(wrapper.find(".about-bio p").text()).toBe("正文");
    expect(wrapper.html()).not.toContain("alert");
  });

  it("渲染标签与链接", async () => {
    const wrapper = await mountAbout({
      tags: ["Vue", "Java"],
      links: [{ name: "GitHub", url: "https://github.com/x" }],
    });

    const tags = wrapper.findAll(".about-tag").map((tag) => tag.text());
    expect(tags).toEqual(["Vue", "Java"]);

    const link = wrapper.find(".about-link");
    expect(link.text()).toContain("GitHub");
    expect(link.attributes("href")).toBe("https://github.com/x");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
  });

  it("没填的区块整块不渲染，不留空标题", async () => {
    const wrapper = await mountAbout({ displayName: "V1rtual" });

    expect(wrapper.find(".about-name").exists()).toBe(true);
    expect(wrapper.find(".about-tagline").exists()).toBe(false);
    expect(wrapper.find(".about-bio").exists()).toBe(false);
    expect(wrapper.find(".about-tags").exists()).toBe(false);
    expect(wrapper.find(".about-links").exists()).toBe(false);
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
});
