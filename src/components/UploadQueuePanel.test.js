import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import UploadQueuePanel from "@/components/UploadQueuePanel.vue";

const task = (overrides = {}) => ({
  key: 1,
  kind: "upload",
  name: "a.png",
  status: "queued",
  progress: 0,
  error: null,
  // 默认当作已经发出过请求：面板就是为「跑起来之后」准备的
  started: true,
  ...overrides,
});

function mountPanel(props = {}) {
  return mount(UploadQueuePanel, {
    props: { items: [task()], overallProgress: 0, successCount: 0, failedCount: 0, busy: false, ...props },
  });
}

describe("UploadQueuePanel", () => {
  it("没有任务时整个面板都不出现", () => {
    expect(mountPanel({ items: [] }).find(".queue-panel").exists()).toBe(false);
  });

  /**
   * 选好文件但还没点确认时不该冒出来 —— 那还只是弹窗里的草稿，
   * 弹出来会让用户以为已经在传了。
   */
  it("只是排队、还没开始的任务不会让面板弹出来", () => {
    const wrapper = mountPanel({ items: [task({ started: false, status: "queued" })] });

    expect(wrapper.find(".queue-panel").exists()).toBe(false);
  });

  it("有任务开始过之后面板才出现", () => {
    const wrapper = mountPanel({ items: [task({ started: true, status: "uploading", progress: 10 })] });

    expect(wrapper.find(".queue-panel").exists()).toBe(true);
  });

  it("进行中显示总进度，完成后显示成功与失败数", () => {
    const running = mountPanel({
      items: [task({ status: "uploading", progress: 40 })],
      overallProgress: 40,
      busy: true,
    });
    expect(running.find(".queue-summary").text()).toContain("总进度 40%");

    const done = mountPanel({ items: [task({ status: "success", progress: 100 })], overallProgress: 100, successCount: 1 });
    expect(done.find(".queue-summary").text()).toContain("成功 1");
  });

  it("按任务种类分别标注上传 / 编辑 / 换文件", () => {
    const wrapper = mountPanel({
      items: [
        task({ key: 1, kind: "upload" }),
        task({ key: 2, kind: "edit", name: "改标题" }),
        task({ key: 3, kind: "replace", name: "new.png" }),
      ],
    });

    const kinds = wrapper.findAll(".queue-kind").map((node) => node.text());
    expect(kinds).toEqual(["上传", "编辑", "换文件"]);
  });

  it("排队中与上传中的任务都能取消", async () => {
    const wrapper = mountPanel({
      items: [task({ key: 1, status: "queued" }), task({ key: 2, status: "uploading", progress: 10 })],
    });

    const buttons = wrapper.findAll(".queue-item .queue-btn");
    expect(buttons).toHaveLength(2);
    await buttons[0].trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("失败与被取消的任务给出重试", async () => {
    const wrapper = mountPanel({
      items: [task({ key: 1, status: "failed" }), task({ key: 2, status: "cancelled" })],
    });

    const buttons = wrapper.findAll(".queue-item .queue-btn");
    expect(buttons.map((n) => n.text())).toEqual(["重试", "重试"]);
    await buttons[0].trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("成功的任务没有取消也没有重试，避免对已完成的东西动手", () => {
    const wrapper = mountPanel({ items: [task({ status: "success", progress: 100 })] });

    expect(wrapper.find(".queue-item .queue-btn").exists()).toBe(false);
  });

  it("可以收起与展开明细", async () => {
    const wrapper = mountPanel();
    expect(wrapper.find(".queue-list").exists()).toBe(true);

    await wrapper.find(".queue-head .queue-btn").trigger("click");

    expect(wrapper.find(".queue-list").exists()).toBe(false);
    expect(wrapper.find(".queue-head").exists()).toBe(true);
  });

  it("点清空抛 clear", async () => {
    const wrapper = mountPanel();

    const clearBtn = wrapper.findAll(".queue-head .queue-btn")[1];
    await clearBtn.trigger("click");

    expect(wrapper.emitted("clear")).toHaveLength(1);
  });

  it("上传中显示百分比而不是状态词", () => {
    const wrapper = mountPanel({ items: [task({ status: "uploading", progress: 65 })], busy: true });

    expect(wrapper.find(".queue-status").text()).toBe("65%");
  });
});
