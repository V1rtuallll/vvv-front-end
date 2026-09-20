import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import GalleryUploadDialog from "@/views/gallery/components/GalleryUploadDialog.vue";

// 选曲面板换成替身：点一下就等于「用户挑好了这一首」。
// 真实的 GalleryBgmPicker 要拉候选、还会建媒体元素，那些都有自己的测试文件。
const BgmPickerStub = {
  name: "GalleryBgmPicker",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  template:
    '<button class="bgm-stub" @click="$emit(\'update:modelValue\', ' +
    "{ src: 'https://cdn.example.test/music/a.mp3', type: 'audio' })\" />",
};

function mountDialog(props = {}) {
  return mount(GalleryUploadDialog, {
    props: { visible: true, limitText: "", ...props },
    global: { stubs: { GalleryBgmPicker: BgmPickerStub } },
  });
}

/** jsdom 的 file input 上 files 是只读的，只能这样塞进去 */
async function pickFile(wrapper, file) {
  const input = wrapper.find(".hidden-input");
  Object.defineProperty(input.element, "files", { value: [file], configurable: true });
  await input.trigger("change");
}

const PNG = () => new File(["x"], "a.png", { type: "image/png" });

describe("GalleryUploadDialog 的背景音乐", () => {
  it("发表时把选好的背景音乐一起带出去", async () => {
    const wrapper = mountDialog();
    await pickFile(wrapper, PNG());

    await wrapper.find(".bgm-stub").trigger("click");
    await wrapper.find(".crt-btn").trigger("click");

    expect(wrapper.emitted("publish")[0][0]).toEqual({
      file: expect.any(File),
      title: "",
      description: "",
      bgm: { src: "https://cdn.example.test/music/a.mp3", type: "audio" },
    });
  });

  it("没选背景音乐时带 null", async () => {
    const wrapper = mountDialog();
    await pickFile(wrapper, PNG());

    await wrapper.find(".crt-btn").trigger("click");

    expect(wrapper.emitted("publish")[0][0].bgm).toBe(null);
  });

  /** 重新打开时带着上一次的曲子，用户会以为它默认就是配好的 */
  it("重新打开是一个干净的表单，不带上一次的曲子", async () => {
    const wrapper = mountDialog();
    await pickFile(wrapper, PNG());
    await wrapper.find(".bgm-stub").trigger("click");

    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    await pickFile(wrapper, PNG());
    await wrapper.find(".crt-btn").trigger("click");

    expect(wrapper.emitted("publish")[0][0].bgm).toBe(null);
  });
});
