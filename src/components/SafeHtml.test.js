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
});
