import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import BlogCommentSection from "@/views/blog/components/BlogCommentSection.vue";

const THREAD = {
  id: 1,
  username: "甲",
  content: "顶层评论",
  likes: 2,
  isLiked: false,
  createdAt: "2026-09-17T10:00:00",
  replies: [
    { id: 2, username: "乙", content: "回复内容", replyToName: "甲", likes: 0, isLiked: false, createdAt: "2026-09-17T11:00:00" },
  ],
};

function mountSection(overrides = {}) {
  return mount(BlogCommentSection, {
    props: {
      threads: [{ ...THREAD, replies: THREAD.replies.map((reply) => ({ ...reply })) }],
      comment: "",
      replyTo: null,
      expandedThreads: new Set(),
      posting: false,
      canPost: true,
      formatShortDate: () => "2026/9/17",
      canManageComment: () => false,
      ...overrides,
    },
  });
}

describe("BlogCommentSection", () => {
  it("默认只渲染顶层评论，标题里的数字含折叠中的回复", () => {
    const wrapper = mountSection();

    expect(wrapper.findAll(".comment-item")).toHaveLength(1);
    expect(wrapper.find(".comments-title").text()).toContain("2");
  });

  it("展开某条线程后回复出现，并带缩进类与回复对象", async () => {
    const wrapper = mountSection({ expandedThreads: new Set(["1"]) });

    const items = wrapper.findAll(".comment-item");
    expect(items).toHaveLength(2);
    expect(items[1].classes()).toContain("comment-reply-item");
    expect(items[1].find(".comment-reply-to").text()).toBe("回复 @甲");
  });

  it("点「展开回复」把根评论 id 交出去", async () => {
    const wrapper = mountSection();

    await wrapper.find(".comment-replies-toggle").trigger("click");

    expect(wrapper.emitted("toggle-replies")[0]).toEqual([1]);
  });

  it("输入为空时发送按钮不可用，有内容后点击发出 post-comment", async () => {
    const wrapper = mountSection();

    expect(wrapper.find(".send-btn").attributes("disabled")).toBeDefined();

    // 本文件直接挂组件、没有 update:comment 的消费方，敲键盘改不了 prop，因此用
    // setProps 驱动：这条证明的是「按钮可用性跟随 prop」，往返（输入 → 事件 → prop）
    // 由 Task 8 的详情页测试负责 —— 那里挂的是真页面，有真正的父状态。
    await wrapper.setProps({ comment: "新评论" });
    expect(wrapper.find(".send-btn").attributes("disabled")).toBeUndefined();

    await wrapper.find(".send-btn").trigger("click");
    expect(wrapper.emitted("post-comment")).toHaveLength(1);
  });

  it("进入回复态时显示回复对象，可以取消", async () => {
    const wrapper = mountSection({ replyTo: { id: 1, username: "甲" } });

    expect(wrapper.find(".reply-banner").text()).toContain("甲");

    await wrapper.find(".reply-cancel").trigger("click");
    expect(wrapper.emitted("cancel-reply")).toHaveLength(1);
  });

  it("有删除权限的评论才显示删除按钮", () => {
    expect(mountSection().find(".comment-delete-btn").exists()).toBe(false);
    expect(mountSection({ canManageComment: () => true }).find(".comment-delete-btn").exists()).toBe(true);
  });

  it("未登录时不出现输入框，显示中性提示", () => {
    const wrapper = mountSection({ canPost: false });

    expect(wrapper.find(".comment-input").exists()).toBe(false);
    expect(wrapper.find(".comment-signin-hint").text()).toBe("登录后可评论");
  });
});
