import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import BlogCard from "@/views/blog/components/BlogCard.vue";

const BLOG = {
  id: 7,
  title: "第一篇",
  summary: "摘要文本",
  coverImage: "/cover.png",
  authorUsername: "V1rtual",
  views: 12,
  commentCount: 3,
  createdAt: "2026-09-17T10:00:00",
};

describe("BlogCard", () => {
  it("渲染标题、摘要、作者与互动数", () => {
    const wrapper = mount(BlogCard, { props: { blog: { ...BLOG } } });

    expect(wrapper.find(".blog-card-head-title").text()).toBe("第一篇");
    expect(wrapper.find(".blog-card-summary").text()).toBe("摘要文本");
    expect(wrapper.find(".blog-card-author").text()).toBe("@V1rtual");
    expect(wrapper.find(".blog-card-stats").text()).toContain("12");
    expect(wrapper.find(".blog-card-stats").text()).toContain("3");
  });

  it("有封面才渲染封面", () => {
    expect(mount(BlogCard, { props: { blog: { ...BLOG } } })
      .find(".blog-card-cover").attributes("src")).toBe("/cover.png");

    expect(mount(BlogCard, { props: { blog: { ...BLOG, coverImage: null } } })
      .find(".blog-card-cover").exists()).toBe(false);
  });

  it("摘要按纯文本渲染，里面的标签不会变成元素", () => {
    // 摘要是后端从 Markdown 剥离出来的纯文本，不含 HTML；
    // 这里用插值而不是任何 HTML 出口，标签只会原样显示
    const wrapper = mount(BlogCard, { props: { blog: { ...BLOG, summary: "<b>加粗</b>" } } });

    expect(wrapper.find(".blog-card-summary b").exists()).toBe(false);
    expect(wrapper.find(".blog-card-summary").text()).toBe("<b>加粗</b>");
  });

  it("缺摘要与作者时给中性占位", () => {
    const wrapper = mount(BlogCard, { props: { blog: { ...BLOG, summary: "", authorUsername: null } } });

    expect(wrapper.find(".blog-card-summary").text()).toBe("暂无摘要");
    expect(wrapper.find(".blog-card-author").text()).toBe("@神秘人");
  });

  it("时间取不到时显示未知时间，不显示 1970", () => {
    const wrapper = mount(BlogCard, { props: { blog: { ...BLOG, createdAt: null } } });

    expect(wrapper.find(".blog-card-time").text()).toBe("未知时间");
  });
});
