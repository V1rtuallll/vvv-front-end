import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AdminQuickActions from "@/views/admin/components/AdminQuickActions.vue";

const queued = (name) => ({ key: name, name, status: "queued", progress: 0 });

function mountActions(props = {}) {
  return mount(AdminQuickActions, {
    props: { syncing: false, uploading: false, uploadItems: [], ...props },
  });
}

describe("AdminQuickActions 的上传确认", () => {
  it("选择文件只排队，不会立刻开始上传", async () => {
    const wrapper = mountActions();

    await wrapper.find("input[type=file]").trigger("change");

    expect(wrapper.emitted("select-files")).toHaveLength(1);
    expect(wrapper.emitted("upload")).toBeFalsy();
  });

  it("有待确认的文件时，提示并给出开始按钮", () => {
    const wrapper = mountActions({ uploadItems: [queued("a.png"), queued("b.png")] });

    expect(wrapper.text()).toContain("确认后才会开始上传");
    expect(wrapper.text()).toContain("已选 2 个文件");
    expect(wrapper.find(".start-upload-btn").text()).toContain("2 个");
  });

  it("点「开始上传」才抛出 upload", async () => {
    const wrapper = mountActions({ uploadItems: [queued("a.png")] });

    await wrapper.find(".start-upload-btn").trigger("click");

    expect(wrapper.emitted("upload")).toHaveLength(1);
  });

  it("没有待确认的文件时不显示开始按钮", () => {
    expect(mountActions().find(".start-upload-btn").exists()).toBe(false);
    expect(
      mountActions({ uploadItems: [{ key: 1, status: "success" }] }).find(".start-upload-btn").exists(),
    ).toBe(false);
  });

  it("上传进行中不显示开始按钮，避免重复提交", () => {
    const wrapper = mountActions({ uploading: true, uploadItems: [queued("a.png")] });

    expect(wrapper.find(".start-upload-btn").exists()).toBe(false);
    // 进度交给页面顶部的队列面板，这里不再重复一份
    expect(wrapper.text()).toContain("进度见页面顶部");
  });

  it("上传中禁用文件选择，避免中途换批次", () => {
    const wrapper = mountActions({ uploading: true });

    expect(wrapper.find("input[type=file]").attributes("disabled")).toBeDefined();
  });

  it("不再自己渲染上传结果列表，交给顶部面板统一显示", () => {
    const failed = { key: 1, name: "a.png", status: "failed", error: "上传失败", progress: 0 };

    expect(mountActions({ uploadItems: [failed] }).find(".upload-results").exists()).toBe(false);
  });
});
