import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AboutContent from "@/views/about/components/AboutContent.vue";

function content(overrides = {}) {
  return {
    avatarSrc: "",
    displayName: "",
    tagline: "",
    bioHtml: "",
    links: [],
    tags: [],
    ...overrides,
  };
}

function mountContent(overrides) {
  return mount(AboutContent, { props: { content: content(overrides) } });
}

describe("AboutContent 组件", () => {
  it("渲染昵称与签名", () => {
    const wrapper = mountContent({ displayName: "V1rtual", tagline: "在代码与幻想之间游荡" });

    expect(wrapper.find(".about-name").text()).toBe("V1rtual");
    expect(wrapper.find(".about-tagline").text()).toBe("在代码与幻想之间游荡");
  });

  it("渲染头像，没填时整块不渲染", () => {
    const wrapper = mountContent({ avatarSrc: "/avatar.png", displayName: "V1rtual" });

    const avatar = wrapper.find(".about-avatar");
    expect(avatar.attributes("src")).toBe("/avatar.png");
    expect(avatar.attributes("alt")).toBe("V1rtual");

    expect(mountContent({ displayName: "V1rtual" }).find(".about-avatar").exists()).toBe(false);
  });

  it("渲染正文并走白名单过滤", () => {
    const wrapper = mountContent({ bioHtml: '<p>正文</p><script>alert(1)</script>' });

    expect(wrapper.find(".about-bio p").text()).toBe("正文");
    expect(wrapper.html()).not.toContain("alert");
  });

  it("渲染标签与链接", () => {
    const wrapper = mountContent({
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

  it("链接带图标时渲染图标", () => {
    const wrapper = mountContent({
      links: [{ name: "GitHub", url: "https://x", icon: "/i.gif" }],
    });

    const icon = wrapper.find(".about-link .about-link-icon");
    expect(icon.exists()).toBe(true);
    expect(icon.attributes("src")).toBe("/i.gif");
  });

  it("链接没图标时只渲染文字", () => {
    const wrapper = mountContent({
      links: [
        { name: "GitHub", url: "https://x" },
        { name: "Blog", url: "https://y", icon: "" },
      ],
    });

    expect(wrapper.findAll(".about-link-icon")).toHaveLength(0);
    expect(wrapper.findAll(".about-link").map((link) => link.text()))
      .toEqual(["» GitHub ↗", "» Blog ↗"]);
  });

  it("没填图标时按链接地址匹配品牌图标", () => {
    const wrapper = mountContent({
      links: [{ name: "GitHub", url: "https://www.github.com/V1rtual" }],
    });

    const icon = wrapper.find(".about-link-icon");
    expect(icon.exists()).toBe(true);
    expect(icon.attributes("src")).toBe("/icons/github.svg");
  });

  it("填了图标时以填写的为准，不覆盖成品牌图标", () => {
    const wrapper = mountContent({
      links: [{ name: "GitHub", url: "https://github.com/V1rtual", icon: "/stickers/cat.gif" }],
    });

    expect(wrapper.find(".about-link-icon").attributes("src")).toBe("/stickers/cat.gif");
  });

  it("地址匹配不到品牌图标时只渲染文字", () => {
    const wrapper = mountContent({
      links: [{ name: "博客", url: "https://example.com" }],
    });

    expect(wrapper.findAll(".about-link-icon")).toHaveLength(0);
    expect(wrapper.find(".about-link").text()).toBe("» 博客 ↗");
  });

  it("没填的区块整块不渲染，不留空标题", () => {
    const wrapper = mountContent({ displayName: "V1rtual" });

    expect(wrapper.find(".about-name").exists()).toBe(true);
    expect(wrapper.find(".about-tagline").exists()).toBe(false);
    expect(wrapper.find(".about-bio").exists()).toBe(false);
    expect(wrapper.find(".about-tags").exists()).toBe(false);
    expect(wrapper.find(".about-links").exists()).toBe(false);
  });

  it("只填了签名时身份区照常渲染，不显示占位", () => {
    const wrapper = mountContent({ tagline: "在代码与幻想之间游荡" });

    expect(wrapper.find(".about-identity").exists()).toBe(true);
    expect(wrapper.find(".about-tagline").text()).toBe("在代码与幻想之间游荡");
    expect(wrapper.find(".about-empty").exists()).toBe(false);
  });

  it("只填了标签时不显示占位，标签照常渲染", () => {
    const wrapper = mountContent({ tags: ["Vue"] });

    expect(wrapper.find(".about-empty").exists()).toBe(false);
    expect(wrapper.findAll(".about-tag").map((tag) => tag.text())).toEqual(["Vue"]);
  });

  it("只填了链接时不显示占位，链接照常渲染", () => {
    const wrapper = mountContent({ links: [{ name: "GitHub", url: "https://x" }] });

    expect(wrapper.find(".about-empty").exists()).toBe(false);
    const link = wrapper.find(".about-link");
    expect(link.text()).toContain("GitHub");
    expect(link.attributes("href")).toBe("https://x");
  });

  it("正文、标签、链接都为空时显示占位，身份区仍在", () => {
    const wrapper = mountContent({ displayName: "V1rtual" });

    expect(wrapper.find(".about-empty").text()).toBe("这里还没有内容");
    expect(wrapper.find(".about-identity").exists()).toBe(true);
    expect(wrapper.find(".about-name").text()).toBe("V1rtual");
  });

  it("有正文时不显示占位", () => {
    const wrapper = mountContent({ bioHtml: "<p>正文</p>" });

    expect(wrapper.find(".about-empty").exists()).toBe(false);
  });
});
