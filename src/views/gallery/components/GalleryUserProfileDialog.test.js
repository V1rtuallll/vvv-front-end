import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import GalleryUserProfileDialog from "@/views/gallery/components/GalleryUserProfileDialog.vue";

const PROFILE = {
  id: 3,
  username: "甲",
  sex: "FEMALE",
  description: "你好",
  avatar: "https://example.test/avatar.png",
  createdAt: "2025-01-02T03:04:05",
};

// 两个函数由页面通过 props 传入，这里用等价的替身，断言只关心弹窗渲染了什么
const formatDate = (value) => (value ? "格式化后的时间" : "未知时间");
const displayGender = (sex) => (sex === "FEMALE" ? "女" : "未设置");

function mountDialog(user = PROFILE, visible = true) {
  return mount(GalleryUserProfileDialog, {
    props: { visible, user, displayGender, formatDate },
  });
}

describe("GalleryUserProfileDialog", () => {
  it("读到资料时逐项显示", () => {
    const text = mountDialog().text();

    expect(text).toContain("甲");
    expect(text).toContain("ID：3");
    expect(text).toContain("性别：女");
    expect(text).toContain("描述：你好");
    expect(text).toContain("创建时间：格式化后的时间");
  });

  /**
   * 读不到资料时这一层没有任何事实可展示。补默认头像与空字段会把「失败」
   * 渲染成一份看起来正常的记录，用户无从分辨哪些是真数据。
   */
  it("读不到资料时只显示用户名与失败说明", () => {
    const wrapper = mountDialog({ username: "查无此人", loadFailed: true });
    const text = wrapper.text();

    expect(text).toContain("查无此人");
    expect(text).toContain("用户信息加载失败");
    expect(text).not.toContain("ID：");
    expect(text).not.toContain("性别：");
    expect(text).not.toContain("描述：");
    expect(text).not.toContain("创建时间：");
    expect(wrapper.find(".crt-avatar").exists()).toBe(false);
  });

  it("失败说明也可以点到关闭", async () => {
    const wrapper = mountDialog({ username: "查无此人", loadFailed: true });

    await wrapper.find(".close-profile-btn").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  /** 「未设置」「未知时间」是服务器确实没给值时才出现的说法，不是失败时的填充 */
  it("服务器返回空字段时如实说明缺失", () => {
    const text = mountDialog({ ...PROFILE, sex: null, description: null, createdAt: null }).text();

    expect(text).toContain("性别：未设置");
    expect(text).toContain("描述：未设置");
    expect(text).toContain("创建时间：未知时间");
  });

  it("visible 为 false 时整块不渲染", () => {
    expect(mountDialog(PROFILE, false).find(".crt-profile-modal").exists()).toBe(false);
  });
});
