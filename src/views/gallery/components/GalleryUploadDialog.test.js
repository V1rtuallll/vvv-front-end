import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
async function pick(wrapper, files) {
  const input = wrapper.find(".hidden-input");
  Object.defineProperty(input.element, "files", { value: files, configurable: true });
  await input.trigger("change");
}

const png = (name) => new File(["x"], name, { type: "image/png" });
const mp4 = (name) => new File(["x"], name, { type: "video/mp4" });
const mp3 = (name) => new File(["x"], name, { type: "audio/mpeg" });

const BGM = { src: "https://cdn.example.test/music/a.mp3", type: "audio" };

const publishButton = (wrapper) => wrapper.find(".crt-btn");
const rows = (wrapper) => wrapper.findAll(".file-row");
const names = (wrapper) => wrapper.findAll(".file-name").map((node) => node.text());

describe("GalleryUploadDialog 的多选批次", () => {
  beforeEach(() => {
    // 预览地址只用来给 <img>/<video> 当 src，断言地址本身没有意义，
    // 这里换成可预测的返回值，好断言「什么时候释放了它」
    URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
    URL.revokeObjectURL = vi.fn();
  });

  it("文件选择支持多选", () => {
    const wrapper = mountDialog();

    expect(wrapper.find("input[type=file]").attributes("multiple")).toBeDefined();
  });

  it("一次选多个文件会按顺序全部进列表", async () => {
    const wrapper = mountDialog();

    await pick(wrapper, [png("a.png"), png("b.png")]);

    expect(names(wrapper)).toEqual(["a.png", "b.png"]);
  });

  /** 图片与 GIF 在后端算一族（都是静图），放进同一批不会走到「不能加入」那一步 */
  it("静图与 GIF 属于同一族，可以放进同一批", async () => {
    const wrapper = mountDialog();

    await pick(wrapper, [png("a.png"), new File(["x"], "b.gif", { type: "image/gif" })]);

    expect(names(wrapper)).toEqual(["a.png", "b.gif"]);
  });

  /**
   * 一批文件进的是同一个作品，而一个作品里的媒体必须同族：
   * 混进一段视频会让详情弹窗在静图与播放器之间跳。
   * 整批退回而不是只收下同族的那几个 —— 用户得看得见自己选的哪些没进去。
   */
  it("一批里混着静图与视频时整批退回", async () => {
    const wrapper = mountDialog();

    await pick(wrapper, [png("a.png"), mp4("b.mp4")]);

    expect(window.$vmessage.warning).toHaveBeenCalledWith("一次只能上传同一类的文件");
    expect(rows(wrapper)).toHaveLength(0);
    expect(publishButton(wrapper).attributes("disabled")).toBeDefined();
  });

  it("可以单独移除批次里的一份", async () => {
    const wrapper = mountDialog();
    await pick(wrapper, [png("a.png"), png("b.png")]);

    await wrapper.findAll(".file-remove")[0].trigger("click");

    expect(names(wrapper)).toEqual(["b.png"]);
  });

  /** 预览地址是浏览器持有的资源，不释放就会一直留到页面关掉 */
  it("移除一份文件时释放它的预览地址", async () => {
    const wrapper = mountDialog();
    await pick(wrapper, [png("a.png"), png("b.png")]);

    await wrapper.findAll(".file-remove")[0].trigger("click");

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:a.png");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("发表时把整批文件一起带出去，并清空列表", async () => {
    const wrapper = mountDialog();
    await pick(wrapper, [png("a.png"), png("b.png")]);

    await publishButton(wrapper).trigger("click");

    const payload = wrapper.emitted("publish")[0][0];
    expect(payload.files.map((entry) => entry.file.name)).toEqual(["a.png", "b.png"]);
    expect(payload.title).toBe("");
    expect(payload.description).toBe("");
    expect(payload.bgm).toBe(null);
    expect(rows(wrapper)).toHaveLength(0);
    // 已经交出去的文件，预览地址跟着一起释放
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  /** 没有文件时发表按钮不可用，本地就拦下，不用等服务端回一句参数不合法 */
  it("一份文件都没有时不能发表", async () => {
    const wrapper = mountDialog();

    await publishButton(wrapper).trigger("click");

    expect(publishButton(wrapper).attributes("disabled")).toBeDefined();
    expect(wrapper.emitted("publish")).toBeUndefined();
  });
});

describe("GalleryUploadDialog 的背景音乐", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
    URL.revokeObjectURL = vi.fn();
  });

  it("发表时把选好的背景音乐一起带出去", async () => {
    const wrapper = mountDialog();
    await pick(wrapper, [png("a.png")]);

    await wrapper.find(".bgm-stub").trigger("click");
    await publishButton(wrapper).trigger("click");

    const payload = wrapper.emitted("publish")[0][0];
    expect(payload.files.map((entry) => entry.file.name)).toEqual(["a.png"]);
    expect(payload.bgm).toEqual(BGM);
  });

  it("没选背景音乐时带 null", async () => {
    const wrapper = mountDialog();
    await pick(wrapper, [png("a.png")]);

    await publishButton(wrapper).trigger("click");

    expect(wrapper.emitted("publish")[0][0].bgm).toBe(null);
  });

  /**
   * 后端规则 3：music 项自己就是音源，再配一首会出现第二条没有控件解释的音轨，
   * 整条上传会被 400 拒掉 —— 上传路径上这个代价比别处大，文件根本没传上去。
   */
  it("音频批次不显示选曲面板", async () => {
    const wrapper = mountDialog();
    await pick(wrapper, [mp3("c.mp3")]);

    expect(wrapper.find(".bgm-stub").exists()).toBe(false);
  });

  /** 规则 3 本轮放宽到 video：视频原声与 BGM 同时出声是产品要求 */
  it("视频批次也显示选曲面板", async () => {
    const wrapper = mountDialog();
    await pick(wrapper, [mp4("a.mp4")]);

    expect(wrapper.find(".bgm-stub").exists()).toBe(true);
  });

  /**
   * 面板藏起来时曲子必须一起清掉：留着它用户既看不到面板、也没有入口取消，
   * 发表时却会被后端整条拒掉，还看不出是哪一步的问题。
   */
  it("清空列表后换成音频批次，不带出上一次选的曲子", async () => {
    const wrapper = mountDialog();
    await pick(wrapper, [png("a.png")]);
    await wrapper.find(".bgm-stub").trigger("click");

    await wrapper.find(".file-remove").trigger("click");
    await pick(wrapper, [mp3("c.mp3")]);
    await publishButton(wrapper).trigger("click");

    expect(wrapper.find(".bgm-stub").exists()).toBe(false);
    expect(wrapper.emitted("publish")[0][0].bgm).toBe(null);
  });

  /** 重新打开时带着上一次的曲子，用户会以为它默认就是配好的 */
  it("重新打开是一个干净的表单，不带上一次的曲子与文件", async () => {
    const wrapper = mountDialog();
    await pick(wrapper, [png("a.png")]);
    await wrapper.find(".bgm-stub").trigger("click");

    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });

    expect(names(wrapper)).toEqual([]);
    await pick(wrapper, [png("a.png")]);
    await publishButton(wrapper).trigger("click");

    expect(wrapper.emitted("publish")[0][0].bgm).toBe(null);
  });
});
