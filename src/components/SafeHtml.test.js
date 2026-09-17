import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SafeHtml from "@/components/SafeHtml.vue";

describe("SafeHtml", () => {
  it("渲染白名单内的内容", () => {
    const wrapper = mount(SafeHtml, { props: { html: "<p>正文</p>" } });

    expect(wrapper.find("p").text()).toBe("正文");
  });

  it("渲染前先过滤，调用方无法绕过", () => {
    const wrapper = mount(SafeHtml, { props: { html: '<img src=x onerror="window.__pwned=1">' } });

    expect(wrapper.html()).not.toContain("onerror");
    expect(window.__pwned).toBeUndefined();
  });

  it("空内容渲染成空容器", () => {
    expect(mount(SafeHtml).find(".safe-html").text()).toBe("");
  });

  it("markdown 为真时把 Markdown 渲染成 HTML", () => {
    const wrapper = mount(SafeHtml, { props: { html: "# 标题", markdown: true } });

    expect(wrapper.find("h1").text()).toBe("标题");
  });

  it("markdown 为假时原文里的标记不生效，仍然是纯文本", () => {
    const wrapper = mount(SafeHtml, { props: { html: "# 标题" } });

    expect(wrapper.find("h1").exists()).toBe(false);
    expect(wrapper.text()).toBe("# 标题");
  });

  it("markdown 为真时渲染链末端仍然是过滤，脚本与内联事件都进不来", () => {
    const wrapper = mount(SafeHtml, {
      props: {
        html: '<script>alert(1)</script>\n\n<video src="/a.mp4" onerror="window.__pwned=1"></video>',
        markdown: true,
      },
    });

    expect(wrapper.html()).not.toContain("alert");
    expect(wrapper.html()).not.toContain("onerror");
    expect(wrapper.find("video").exists()).toBe(true);
    expect(window.__pwned).toBeUndefined();
  });
});
