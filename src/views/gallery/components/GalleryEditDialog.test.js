import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import GalleryEditDialog from "@/views/gallery/components/GalleryEditDialog.vue";

const ITEM = { id: 1, title: "旧标题", description: "旧描述" };

function mountDialog(overrides = {}) {
  return mount(GalleryEditDialog, {
    props: { visible: true, item: { ...ITEM, ...overrides }, saving: false },
  });
}

describe("GalleryEditDialog", () => {
  it("只开放标题与描述两个字段", () => {
    const labels = mountDialog()
      .findAll(".field-label")
      .map((node) => node.text());

    expect(labels).toEqual(["标题", "描述"]);
  });

  it("不再出现 alt / 标签 / 分类 —— 它们没有对应业务场景", () => {
    const text = mountDialog().text();

    expect(text).not.toContain("alt");
    expect(text).not.toContain("标签");
    expect(text).not.toContain("分类");
  });

  it("打开时回填当前值", () => {
    const wrapper = mountDialog();

    expect(wrapper.find("input").element.value).toBe("旧标题");
    expect(wrapper.find("textarea").element.value).toBe("旧描述");
  });

  it("只提交改动过的字段，没碰过的值不写回", async () => {
    const wrapper = mountDialog();

    await wrapper.find("input").setValue("新标题");
    await wrapper.find(".save-btn").trigger("click");

    expect(wrapper.emitted("submit")).toEqual([[{ title: "新标题" }]]);
  });

  it("两个字段都改时一起提交", async () => {
    const wrapper = mountDialog();

    await wrapper.find("input").setValue("新标题");
    await wrapper.find("textarea").setValue("新描述");
    await wrapper.find(".save-btn").trigger("click");

    expect(wrapper.emitted("submit")).toEqual([[{ title: "新标题", description: "新描述" }]]);
  });

  it("原样打开再保存提交空对象，由上层提示未修改", async () => {
    const wrapper = mountDialog();

    await wrapper.find(".save-btn").trigger("click");

    expect(wrapper.emitted("submit")).toEqual([[{}]]);
  });

  it("保存中禁用两个按钮", () => {
    const wrapper = mount(GalleryEditDialog, {
      props: { visible: true, item: ITEM, saving: true },
    });

    expect(wrapper.find(".save-btn").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".cancel-btn").attributes("disabled")).toBeDefined();
  });

  it("点取消抛 close，不抛 submit", async () => {
    const wrapper = mountDialog();

    await wrapper.find(".cancel-btn").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(wrapper.emitted("submit")).toBeFalsy();
  });
});
