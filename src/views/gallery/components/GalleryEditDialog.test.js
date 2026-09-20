import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import GalleryEditDialog from "@/views/gallery/components/GalleryEditDialog.vue";

const ITEM = {
  id: 1,
  type: "photo",
  title: "旧标题",
  description: "旧描述",
  src: "https://example.test/imgs/9f3c1a2b-4d5e.png",
};

// 选曲面板换成替身，理由同 GalleryUploadDialog.test.js
const BgmPickerStub = {
  name: "GalleryBgmPicker",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  template:
    '<button class="bgm-stub" @click="$emit(\'update:modelValue\', ' +
    "{ src: 'https://cdn.example.test/music/new.mp3', type: 'audio' })\" />",
};

function mountDialog(overrides = {}, replacementFile = null) {
  return mount(GalleryEditDialog, {
    props: { visible: true, item: { ...ITEM, ...overrides }, saving: false, replacementFile },
    global: { stubs: { GalleryBgmPicker: BgmPickerStub } },
  });
}

const textFields = (wrapper) => wrapper.findAll(".field-input");

/** jsdom 的 file input 上 files 是只读的，只能这样塞进去 */
async function pickFile(wrapper, file) {
  const input = wrapper.find(".file-input");
  Object.defineProperty(input.element, "files", { value: [file], configurable: true });
  await input.trigger("change");
}

describe("GalleryEditDialog", () => {
  it("可编辑的只有标题与描述两个文本字段", () => {
    const fields = textFields(mountDialog());

    expect(fields).toHaveLength(2);
  });

  it("不再出现 alt / 标签 / 分类 —— 它们没有对应业务场景", () => {
    const text = mountDialog().text();

    expect(text).not.toContain("alt");
    expect(text).not.toContain("标签");
    expect(text).not.toContain("分类");
  });

  it("打开时回填当前值", () => {
    const fields = textFields(mountDialog());

    expect(fields[0].element.value).toBe("旧标题");
    expect(fields[1].element.value).toBe("旧描述");
  });

  it("只提交改动过的字段，没碰过的值不写回", async () => {
    const wrapper = mountDialog();

    await textFields(wrapper)[0].setValue("新标题");
    await wrapper.find(".save-btn").trigger("click");

    expect(wrapper.emitted("submit")).toEqual([[{ title: "新标题" }]]);
  });

  it("两个字段都改时一起提交", async () => {
    const wrapper = mountDialog();

    await textFields(wrapper)[0].setValue("新标题");
    await textFields(wrapper)[1].setValue("新描述");
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
      props: { visible: true, item: ITEM, saving: true, replacementFile: null },
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

describe("GalleryEditDialog 的更换文件", () => {
  it("默认显示当前文件名，并说明不选新文件就只改元数据", () => {
    const wrapper = mountDialog();

    expect(wrapper.find(".file-current").text()).toBe("9f3c1a2b-4d5e.png");
    expect(wrapper.text()).toContain("不选新文件就只改标题与描述");
    expect(wrapper.find(".file-clear").exists()).toBe(false);
  });

  it("选中新文件后抛 select-replacement", async () => {
    const wrapper = mountDialog();
    const file = new File(["x"], "new.png", { type: "image/png" });

    await pickFile(wrapper, file);

    expect(wrapper.emitted("select-replacement")).toEqual([[file]]);
  });

  it("已选新文件时显示将要替换成什么，并给出撤销入口", () => {
    const wrapper = mountDialog({}, new File(["x"], "new.png", { type: "image/png" }));

    expect(wrapper.find(".file-chosen").text()).toContain("new.png");
    expect(wrapper.find(".file-chosen").text()).toContain("保存后才会上传");
    expect(wrapper.find(".file-clear").exists()).toBe(true);
  });

  it("点「撤销更换」抛 select-replacement 且值为 null", async () => {
    const wrapper = mountDialog({}, new File(["x"], "new.png", { type: "image/png" }));

    await wrapper.find(".file-clear").trigger("click");

    expect(wrapper.emitted("select-replacement")).toEqual([[null]]);
  });

  it("选完文件后清空 input，同一个文件能再选一次", async () => {
    const wrapper = mountDialog();
    const input = wrapper.find(".file-input");
    const file = new File(["x"], "new.png", { type: "image/png" });

    await pickFile(wrapper, file);

    expect(input.element.value).toBe("");
  });
});

describe("GalleryEditDialog 的背景音乐", () => {
  const WITH_BGM = {
    bgmSrc: "https://cdn.example.test/music/old.mp3",
    bgmType: "audio",
  };

  /**
   * 后端规则 3：music / video 项配 BGM 会被整条请求 400 拒掉，编辑会整个失败。
   * 选择器只在这些项上收起来，保存根本发不出这套组合。
   */
  it("音乐与视频项不显示选曲面板", () => {
    const picker = (type) => mountDialog({ type }).findComponent({ name: "GalleryBgmPicker" });

    expect(picker("music").exists()).toBe(false);
    expect(picker("video").exists()).toBe(false);
  });

  /** 图文项是配 BGM 的场景本身，面板当然要在 */
  it("图文项显示选曲面板", () => {
    expect(mountDialog().findComponent({ name: "GalleryBgmPicker" }).exists()).toBe(true);
  });

  it("打开时回填当前配的曲子", () => {
    const wrapper = mountDialog(WITH_BGM);

    expect(wrapper.findComponent({ name: "GalleryBgmPicker" }).props("modelValue")).toEqual({
      src: "https://cdn.example.test/music/old.mp3", type: "audio",
    });
  });

  /** 没改动就不提它：「原样打开再保存」不该顺手把 BGM 重写一遍 */
  it("没改 BGM 时载荷里不出现它", async () => {
    const wrapper = mountDialog(WITH_BGM);

    await wrapper.find(".save-btn").trigger("click");

    expect(wrapper.emitted("submit")).toEqual([[{}]]);
  });

  it("改了 BGM 时两个字段一起提交", async () => {
    const wrapper = mountDialog();

    await wrapper.find(".bgm-stub").trigger("click");
    await wrapper.find(".save-btn").trigger("click");

    expect(wrapper.emitted("submit")[0][0]).toEqual({
      bgmSrc: "https://cdn.example.test/music/new.mp3",
      bgmType: "audio",
    });
  });

  /** 清空要发两个 null，只发一个会被服务端当成参数不完整而拒绝整次编辑 */
  it("取消背景音乐时两个字段都发 null", async () => {
    const wrapper = mountDialog(WITH_BGM);

    // 替身直接把值改成另一首，这里改用「清空」的替身行为来触发
    await wrapper.findComponent({ name: "GalleryBgmPicker" }).vm.$emit("update:modelValue", null);
    await wrapper.find(".save-btn").trigger("click");

    expect(wrapper.emitted("submit")[0][0]).toEqual({ bgmSrc: null, bgmType: null });
  });

  it("BGM 与文本字段可以一起提交", async () => {
    const wrapper = mountDialog();

    await textFields(wrapper)[0].setValue("新标题");
    await wrapper.find(".bgm-stub").trigger("click");
    await wrapper.find(".save-btn").trigger("click");

    expect(wrapper.emitted("submit")[0][0]).toEqual({
      title: "新标题",
      bgmSrc: "https://cdn.example.test/music/new.mp3",
      bgmType: "audio",
    });
  });
});
