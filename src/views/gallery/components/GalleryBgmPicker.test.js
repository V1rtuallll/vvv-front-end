import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/gallery/api/galleryApi", () => ({
  getGalleryBgmCandidates: vi.fn(),
  uploadGalleryBgm: vi.fn(),
}));

const bgmSpies = vi.hoisted(() => ({
  play: vi.fn(),
  playSource: vi.fn(),
  stop: vi.fn(),
  activeId: { value: null },
}));

// resolveBgm 用真的：候选该贡献出什么曲子是它定的规则，桩掉它等于把被测规则一起换掉。
// 只把播放侧换成替身 —— 真实实现会在 jsdom 里建真的媒体元素，既没解码器、也超出本文件的范围。
vi.mock("@/modules/gallery/composables/useGalleryBgm", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useGalleryBgm: () => ({ ...bgmSpies }) };
});

import { getGalleryBgmCandidates, uploadGalleryBgm } from "@/modules/gallery/api/galleryApi";
import GalleryBgmPicker from "@/views/gallery/components/GalleryBgmPicker.vue";

const SONG = { id: 1, type: "music", title: "一首歌", src: "https://cdn.example.test/music/a.mp3" };
const VIDEO = { id: 2, type: "video", title: "一段片", src: "https://cdn.example.test/video/b.mp4" };
const WITH_BGM = {
  id: 3, type: "photo", title: "配过曲子的图", src: "https://cdn.example.test/imgs/c.png",
  bgmSrc: "https://cdn.example.test/music/a.mp3", bgmType: "audio",
};

function mountPicker(modelValue = null) {
  return mount(GalleryBgmPicker, { props: { modelValue } });
}

async function openPanel(wrapper) {
  await wrapper.find(".bgm-toggle-btn").trigger("click");
  await flushPromises();
}

async function pickFile(wrapper, file) {
  const input = wrapper.find(".bgm-file-input");
  Object.defineProperty(input.element, "files", { value: [file], configurable: true });
  await input.trigger("change");
}

beforeEach(() => {
  vi.clearAllMocks();
  bgmSpies.activeId.value = null;
  getGalleryBgmCandidates.mockResolvedValue({ data: [SONG, VIDEO, WITH_BGM] });
});

describe("GalleryBgmPicker 的候选列表", () => {
  it("收起状态下不请求候选", () => {
    mountPicker();

    expect(getGalleryBgmCandidates).not.toHaveBeenCalled();
  });

  it("展开时拉候选，音乐与视频各自标出类型", async () => {
    const wrapper = mountPicker();
    await openPanel(wrapper);

    expect(getGalleryBgmCandidates).toHaveBeenCalledTimes(1);
    const rows = wrapper.findAll(".bgm-item");
    expect(rows).toHaveLength(3);
    expect(rows[0].text()).toContain("音乐");
    expect(rows[1].text()).toContain("视频");
  });

  /**
   * 图文项只显示自己的标题，不缀它配的那首曲子的文件名。
   *
   * 那个名字取自对象键，多是一串 UUID，既认不出来又把标题挤没了。
   * 选图文项会得到它配的那一首 —— 这件事在点「试听」或「选它」之后就体现出来，
   * 不必在标签上提前展开。
   */
  it("图文项只显示标题，不缀资源名", async () => {
    const wrapper = mountPicker();
    await openPanel(wrapper);

    const row = wrapper.findAll(".bgm-item")[2].text();
    expect(row).toContain("配过曲子的图");
    expect(row).not.toContain("a.mp3");
  });

  it("没有可用资源时给出说明，而不是空白一片", async () => {
    getGalleryBgmCandidates.mockResolvedValue({ data: [] });
    const wrapper = mountPicker();
    await openPanel(wrapper);

    expect(wrapper.find(".bgm-status").text()).toBe("画廊里还没有可用作背景音乐的资源。");
  });
});

describe("GalleryBgmPicker 的选曲", () => {
  it("选音乐项得到 audio 类型", async () => {
    const wrapper = mountPicker();
    await openPanel(wrapper);

    await wrapper.findAll(".bgm-choose-btn")[0].trigger("click");

    expect(wrapper.emitted("update:modelValue")[0]).toEqual([
      { src: "https://cdn.example.test/music/a.mp3", type: "audio" },
    ]);
  });

  it("选视频项得到 video 类型", async () => {
    const wrapper = mountPicker();
    await openPanel(wrapper);

    await wrapper.findAll(".bgm-choose-btn")[1].trigger("click");

    expect(wrapper.emitted("update:modelValue")[0]).toEqual([
      { src: "https://cdn.example.test/video/b.mp4", type: "video" },
    ]);
  });

  /** 图当音源是静音的，选图文项要拿到它配的那一首 */
  it("选图文项得到它配的那一首曲子", async () => {
    const wrapper = mountPicker();
    await openPanel(wrapper);

    await wrapper.findAll(".bgm-choose-btn")[2].trigger("click");

    expect(wrapper.emitted("update:modelValue")[0]).toEqual([
      { src: "https://cdn.example.test/music/a.mp3", type: "audio" },
    ]);
  });

  it("选完收起面板", async () => {
    const wrapper = mountPicker();
    await openPanel(wrapper);

    await wrapper.findAll(".bgm-choose-btn")[0].trigger("click");

    expect(wrapper.find(".bgm-panel").exists()).toBe(false);
  });

  it("已配过时显示当前地址，取消按钮发出 null", async () => {
    const wrapper = mountPicker({ src: "https://cdn.example.test/music/a.mp3", type: "audio" });

    expect(wrapper.find(".bgm-current-name").text()).toBe("https://cdn.example.test/music/a.mp3");

    await wrapper.find(".bgm-clear-btn").trigger("click");

    expect(wrapper.emitted("update:modelValue")[0]).toEqual([null]);
  });

  it("没配过时不显示取消按钮", () => {
    expect(mountPicker().find(".bgm-clear-btn").exists()).toBe(false);
  });
});

describe("GalleryBgmPicker 的试听", () => {
  it("点试听播这一条", async () => {
    const wrapper = mountPicker();
    await openPanel(wrapper);

    await wrapper.find(".bgm-audition-btn").trigger("click");

    expect(bgmSpies.play).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("正在试听的那一条再点一次是停止", async () => {
    const wrapper = mountPicker();
    bgmSpies.activeId.value = SONG.id;
    await openPanel(wrapper);

    expect(wrapper.find(".bgm-audition-btn").text()).toBe("停止");
    await wrapper.find(".bgm-audition-btn").trigger("click");

    expect(bgmSpies.stop).toHaveBeenCalled();
    expect(bgmSpies.play).not.toHaveBeenCalled();
  });

  /**
   * 收起面板会把「停止」按钮连同整个面板一起摘掉。
   * 声音不能留着而控件没了：那时用户没有任何入口能把它停掉。
   */
  it("收起面板时停止试听", async () => {
    const wrapper = mountPicker();
    await openPanel(wrapper);
    bgmSpies.stop.mockClear();

    await wrapper.find(".bgm-toggle-btn").trigger("click");

    expect(wrapper.find(".bgm-panel").exists()).toBe(false);
    expect(bgmSpies.stop).toHaveBeenCalled();
  });

  /** 弹窗关掉试听的声音不能留在后台响 */
  it("组件卸载时停止试听", async () => {
    const wrapper = mountPicker();
    await openPanel(wrapper);

    wrapper.unmount();

    expect(bgmSpies.stop).toHaveBeenCalled();
  });
});

describe("GalleryBgmPicker 的上传", () => {
  it("上传成功后发出地址与类型，并立刻试听", async () => {
    uploadGalleryBgm.mockResolvedValue({
      data: { url: "https://cdn.example.test/music/new.mp3", type: "audio" },
    });
    const wrapper = mountPicker();
    await openPanel(wrapper);

    await pickFile(wrapper, new File(["x"], "new.mp3", { type: "audio/mpeg" }));
    await flushPromises();

    const sent = uploadGalleryBgm.mock.calls[0][0];
    expect(sent.get("file")).toBeInstanceOf(File);
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([
      { src: "https://cdn.example.test/music/new.mp3", type: "audio" },
    ]);
    expect(bgmSpies.playSource).toHaveBeenCalledWith({
      src: "https://cdn.example.test/music/new.mp3", type: "audio",
    });
  });

  it("上传失败时什么都不发，也不重复弹提示", async () => {
    uploadGalleryBgm.mockRejectedValue(new Error("boom"));
    const wrapper = mountPicker();
    await openPanel(wrapper);

    await pickFile(wrapper, new File(["x"], "new.mp3", { type: "audio/mpeg" }));
    await flushPromises();

    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
    expect(bgmSpies.playSource).not.toHaveBeenCalled();
    // 提示由 request.js 负责
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });
});
