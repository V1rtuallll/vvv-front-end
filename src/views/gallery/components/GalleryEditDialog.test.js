import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GalleryEditDialog from "@/views/gallery/components/GalleryEditDialog.vue";

const ITEM = {
  id: 1,
  type: "photo",
  title: "旧标题",
  description: "旧描述",
  src: "https://example.test/imgs/9f3c1a2b-4d5e.png",
};

const PHOTO_A = { id: 11, src: "https://example.test/imgs/a.png", type: "photo" };
const PHOTO_B = { id: 12, src: "https://example.test/imgs/b.png", type: "photo" };
const PHOTO_C = { id: 13, src: "https://example.test/imgs/c.png", type: "photo" };

/** 一个作品：封面与 media[0] 由服务端保证一致，这里照同样的形状拼出来 */
const work = (media, overrides = {}) => ({
  ...ITEM, src: media[0].src, type: media[0].type, media, ...overrides,
});

// 选曲面板换成替身，理由同 GalleryUploadDialog.test.js
const BgmPickerStub = {
  name: "GalleryBgmPicker",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  template:
    '<button class="bgm-stub" @click="$emit(\'update:modelValue\', ' +
    "{ src: 'https://cdn.example.test/music/new.mp3', type: 'audio' })\" />",
};

function mountDialog(overrides = {}) {
  return mount(GalleryEditDialog, {
    props: { visible: true, item: { ...ITEM, ...overrides }, saving: false },
    global: { stubs: { GalleryBgmPicker: BgmPickerStub } },
  });
}

const textFields = (wrapper) => wrapper.findAll(".field-input");
const rows = (wrapper) => wrapper.findAll(".media-row");
const save = (wrapper) => wrapper.find(".save-btn").trigger("click");
/** 最后一次 submit 带出去的载荷 */
const submitted = (wrapper) => wrapper.emitted("submit")?.at(-1)[0];

/**
 * jsdom 里 getBoundingClientRect 全是 0，上/下半判不出来，得自己摆一个。
 * 落点是按指针在目标行的上半还是下半定的。
 */
function stubRowRect(element, top = 100, height = 40) {
  element.getBoundingClientRect = () => ({
    top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top,
  });
}

/**
 * 一次完整的拖拽。真实浏览器里 dragover 一定先于 drop —— 落点就是在
 * 那一步定下来的，所以这里也照同样的顺序发。
 */
async function dragTo(wrapper, from, to, half) {
  const all = rows(wrapper);
  stubRowRect(all[to].element);
  await all[from].find(".media-grip").trigger("dragstart", { dataTransfer: { setData: vi.fn() } });
  await all[to].trigger("dragover", { clientY: half === "before" ? 110 : 130 });
  await all[to].trigger("drop");
}

const png = (name) => new File(["x"], name, { type: "image/png" });

/** jsdom 的 file input 上 files 是只读的，只能这样塞进去 */
async function pick(input, files) {
  Object.defineProperty(input.element, "files", { value: files, configurable: true });
  await input.trigger("change");
}

const pickReplacement = (wrapper, index, file) =>
  pick(wrapper.find(`.media-row:nth-child(${index + 1}) .media-file-input`), [file]);

const addFiles = (wrapper, files) => pick(wrapper.find(".media-add-input"), files);

beforeEach(() => {
  // 预览地址只用来给 <img>/<video> 当 src，断言地址本身没有意义，
  // 这里换成可预测的返回值，好断言「什么时候释放了它」
  URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
  URL.revokeObjectURL = vi.fn();
});

describe("GalleryEditDialog 的文本字段", () => {
  it("可编辑的只有标题与描述两个文本字段", () => {
    const fields = textFields(mountDialog(work([PHOTO_A, PHOTO_B])));

    expect(fields).toHaveLength(2);
  });

  it("不再出现 alt / 标签 / 分类 —— 它们没有对应业务场景", () => {
    const text = mountDialog(work([PHOTO_A])).text();

    expect(text).not.toContain("alt");
    expect(text).not.toContain("标签");
    expect(text).not.toContain("分类");
  });

  it("打开时回填当前值", () => {
    const fields = textFields(mountDialog(work([PHOTO_A])));

    expect(fields[0].element.value).toBe("旧标题");
    expect(fields[1].element.value).toBe("旧描述");
  });

  it("保存中禁用两个按钮", () => {
    const wrapper = mount(GalleryEditDialog, {
      props: { visible: true, item: work([PHOTO_A]), saving: true },
    });

    expect(wrapper.find(".save-btn").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".cancel-btn").attributes("disabled")).toBeDefined();
  });

  it("点取消抛 close，不抛 submit", async () => {
    const wrapper = mountDialog(work([PHOTO_A]));

    await wrapper.find(".cancel-btn").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(wrapper.emitted("submit")).toBeFalsy();
  });
});

describe("GalleryEditDialog 的媒体列表", () => {
  it("打开时按 item.media 逐条列出来", () => {
    expect(rows(mountDialog(work([PHOTO_A, PHOTO_B])))).toHaveLength(2);
  });

  /** 列表接口不带媒体时只有封面那一份数据，按「只有封面这一条」列，而不是列成空的 */
  it("没有 media 时用封面兜底成一条", () => {
    const wrapper = mountDialog();

    expect(rows(wrapper)).toHaveLength(1);
    expect(wrapper.find(".media-name").text()).toBe("9f3c1a2b-4d5e.png");
    expect(wrapper.find(".media-thumb").attributes("src")).toBe(ITEM.src);
  });

  /** 标题与描述是作品级的：一条媒体只有文件，没有自己的标题 */
  it("媒体条目里没有标题输入框", () => {
    expect(mountDialog(work([PHOTO_A, PHOTO_B])).findAll(".media-row input[type=text]")).toHaveLength(0);
  });
});

describe("GalleryEditDialog 的草稿", () => {
  /** 用户点错的概率远高于点对，而删除是没法撤销的：不点保存就什么都不该发生 */
  it("点了删除但没保存：条目只从草稿里消失，什么都没发出去", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await wrapper.find(".media-row:nth-child(2) .media-remove").trigger("click");

    expect(rows(wrapper)).toHaveLength(1);
    expect(wrapper.emitted("submit")).toBeFalsy();
  });

  it("删完直接取消，服务端一次都不会被调到", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await wrapper.find(".media-row:nth-child(2) .media-remove").trigger("click");
    await wrapper.find(".cancel-btn").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(wrapper.emitted("submit")).toBeFalsy();
  });

  it("换了文件但没保存也不发出去", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await pickReplacement(wrapper, 0, png("new.png"));

    expect(wrapper.emitted("submit")).toBeFalsy();
  });

  it("打开时是按传入的那一份数据建的草稿，之后 props 再变也不会顶掉草稿", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await wrapper.find(".media-row:nth-child(2) .media-remove").trigger("click");
    await wrapper.setProps({ saving: true });

    expect(rows(wrapper)).toHaveLength(1);
  });
});

describe("GalleryEditDialog 的媒体增删", () => {
  /** 作品至少要有一个媒体：删空之后 gallery.src 无处可取，也就没有封面了 */
  it("只剩一条媒体时删除按钮禁用", () => {
    const wrapper = mountDialog(work([PHOTO_A]));

    expect(wrapper.find(".media-row .media-remove").attributes("disabled")).toBeDefined();
  });

  it("多于一条时删除按钮可用", () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    expect(wrapper.find(".media-row:nth-child(1) .media-remove").attributes("disabled")).toBeUndefined();
  });

  it("添加媒体支持一次选多个文件，按选择顺序接到草稿尾部", async () => {
    const wrapper = mountDialog(work([PHOTO_A]));
    const first = png("c.png");
    const second = png("d.png");

    await addFiles(wrapper, [first, second]);
    await save(wrapper);

    const { items, newFiles } = submitted(wrapper);
    expect(items).toEqual([{ mediaId: PHOTO_A.id }, { newFile: 0 }, { newFile: 1 }]);
    expect(newFiles).toEqual([first, second]);
  });

  it("换文件之后那一行显示新文件名，不再显示原来的地址", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await pickReplacement(wrapper, 0, png("new.png"));

    expect(wrapper.find(".media-row:nth-child(1) .media-name").text()).toBe("new.png");
    expect(wrapper.find(".media-row:nth-child(1) .media-thumb").attributes("src")).toBe("blob:new.png");
  });

  it("选完文件后清空 input，同一个文件能再选一次", async () => {
    const wrapper = mountDialog(work([PHOTO_A]));
    const input = wrapper.find(".media-file-input");

    await pickReplacement(wrapper, 0, png("new.png"));

    expect(input.element.value).toBe("");
  });

  /**
   * 每一行「换文件」列出的类型跟着这条作品的族。
   *
   * 跨族换文件会被服务端回 400（作品的类型由族决定，换类型要删除后重新上传）。
   * 收窄之后用户拿到的是系统的文件过滤，而不是一条服务端文案 —— 后者要等他把
   * 整个动作做完才发现做不成，而他本可以在选文件那一刻就知道。
   */
  it("换文件列出的类型跟着作品的族", () => {
    const accepts = (type) =>
      mountDialog(work([{ id: 1, src: `/a.${type}`, type }]))
        .find(".media-file-input").attributes("accept");

    expect(accepts("photo")).toBe(".jpg,.jpeg,.png,.webp,.bmp,.gif");
    expect(accepts("gif")).toBe(".jpg,.jpeg,.png,.webp,.bmp,.gif");
    expect(accepts("video")).toBe(".mp4,.webm,.avi,.mov,.mkv");
    expect(accepts("music")).toBe(".mp3,.wav,.flac,.aac,.ogg");
  });

  /**
   * 「添加媒体」不受这条限制：它不限于一行的替换，混族由服务端判。
   * 这里收窄的话，用户会连「加一张同族的图」都选不出来。
   */
  it("添加媒体的清单仍是全量，不跟着作品的族收窄", () => {
    const accept = mountDialog(work([PHOTO_A])).find(".media-add-input").attributes("accept");

    expect(accept).toContain(".mp3");
    expect(accept).toContain(".mp4");
  });
});

describe("GalleryEditDialog 的排序", () => {
  it("上移把条目往前挪，保存时按用户排好的顺序发", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await wrapper.find(".media-row:nth-child(2) .media-move-up").trigger("click");
    await save(wrapper);

    expect(submitted(wrapper).items).toEqual([{ mediaId: PHOTO_B.id }, { mediaId: PHOTO_A.id }]);
  });

  it("下移把条目往后挪", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await wrapper.find(".media-row:nth-child(1) .media-move-down").trigger("click");
    await save(wrapper);

    expect(submitted(wrapper).items).toEqual([{ mediaId: PHOTO_B.id }, { mediaId: PHOTO_A.id }]);
  });

  it("第一条不能再上移、最后一条不能再下移", () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    expect(wrapper.find(".media-row:nth-child(1) .media-move-up").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".media-row:nth-child(2) .media-move-down").attributes("disabled")).toBeDefined();
  });

  /** 原生 draggable 在触屏上不工作，键盘也拖不动：两个按钮是排序的基本入口 */
  it("上移下移是原生按钮，触摸与键盘都能用", () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    expect(wrapper.find(".media-row .media-move-up").element.tagName).toBe("BUTTON");
    expect(wrapper.find(".media-row .media-move-down").element.tagName).toBe("BUTTON");
  });

  /** 拖拽只是额外的便利，顺序一样要落在草稿上 */
  it("拖到另一条的下半等于插到它后面", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await dragTo(wrapper, 0, 1, "after");
    await save(wrapper);

    expect(submitted(wrapper).items).toEqual([{ mediaId: PHOTO_B.id }, { mediaId: PHOTO_A.id }]);
  });

  /**
   * 落点由指针在目标行的上半还是下半决定：上半插到它前面、下半插到它后面。
   * 摘出被拖的条目之后目标的下标会往前挪一位，所以落点要现算 ——
   * 拿原下标硬算的话，往下拖到不相邻的条目上会落到目标后面。
   */
  it("往下拖到不相邻的条目，落在上半就插到它前面", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B, PHOTO_C]));

    await dragTo(wrapper, 0, 2, "before");
    await save(wrapper);

    expect(submitted(wrapper).items).toEqual([
      { mediaId: PHOTO_B.id }, { mediaId: PHOTO_A.id }, { mediaId: PHOTO_C.id },
    ]);
  });

  it("同一个目标，上半与下半得到不同结果", async () => {
    const upper = mountDialog(work([PHOTO_A, PHOTO_B]));
    await dragTo(upper, 0, 1, "before");
    await save(upper);
    // 上半 = 插到 B 前面；A 本来就在 B 前面，顺序没变，也就没有要提交的改动。
    // 落到下半的话顺序会变（下面那段），所以「没提交」本身就说明落点在前面
    expect(upper.emitted("submit")).toBeFalsy();
    expect(rows(upper).map((row) => row.find(".media-name").text())).toEqual(["a.png", "b.png"]);

    const lower = mountDialog(work([PHOTO_A, PHOTO_B]));
    await dragTo(lower, 0, 1, "after");
    await save(lower);
    expect(submitted(lower).items).toEqual([{ mediaId: PHOTO_B.id }, { mediaId: PHOTO_A.id }]);
  });

  /** 整行可拖时想选中文件名文字就会把它拖起来，而且看不出哪里能拖 */
  it("只有握把可拖，整行不可拖", () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    expect(wrapper.findAll(".media-grip")).toHaveLength(2);
    expect(wrapper.find(".media-row").attributes("draggable")).toBeUndefined();
    expect(wrapper.find(".media-grip").attributes("draggable")).toBe("true");
  });

  /** Firefox 要求 dragstart 里写入数据，否则整个拖拽根本不启动 */
  it("拖起时写入 dataTransfer 并声明 move", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };

    await wrapper.find(".media-grip").trigger("dragstart", { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", expect.any(String));
    expect(dataTransfer.effectAllowed).toBe("move");
  });

  it("拖起的那行标成 is-dragging，dragend 时复位", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await wrapper.find(".media-grip").trigger("dragstart", { dataTransfer: { setData: vi.fn() } });
    expect(rows(wrapper)[0].classes()).toContain("is-dragging");

    await wrapper.find(".media-grip").trigger("dragend");

    const classes = rows(wrapper)[0].classes();
    expect(classes).not.toContain("is-dragging");
  });

  it("悬停到目标行时标出落点，上半不带 is-drop-after", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));
    stubRowRect(rows(wrapper)[1].element);

    await rows(wrapper)[0].find(".media-grip").trigger("dragstart", { dataTransfer: { setData: vi.fn() } });
    await rows(wrapper)[1].trigger("dragover", { clientY: 110 });

    const classes = rows(wrapper)[1].classes();
    expect(classes).toContain("is-drop-target");
    expect(classes).not.toContain("is-drop-after");
  });

  it("悬停在下半时带上 is-drop-after", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));
    stubRowRect(rows(wrapper)[1].element);

    await rows(wrapper)[0].find(".media-grip").trigger("dragstart", { dataTransfer: { setData: vi.fn() } });
    await rows(wrapper)[1].trigger("dragover", { clientY: 130 });

    expect(rows(wrapper)[1].classes()).toContain("is-drop-after");
  });
});

describe("GalleryEditDialog 的保存载荷", () => {
  /** 后端是全量替换：标题、描述、BGM、媒体列表都以这次请求里的值为最终值 */
  it("发的是作品的完整最终状态，不是增量", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await textFields(wrapper)[0].setValue("新标题");
    await save(wrapper);

    expect(submitted(wrapper)).toEqual({
      title: "新标题",
      description: "旧描述",
      bgmSrc: null,
      bgmType: null,
      items: [{ mediaId: PHOTO_A.id }, { mediaId: PHOTO_B.id }],
      newFiles: [],
    });
  });

  /** 换过的条目要指成新文件：还发 mediaId 的话服务端会当成「保留原来那一条」，换了等于没换 */
  it("换过文件的条目发 newFile，没换的发 mediaId", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));
    const file = png("new.png");

    await pickReplacement(wrapper, 0, file);
    await save(wrapper);

    const { items, newFiles } = submitted(wrapper);
    expect(items).toEqual([{ newFile: 0 }, { mediaId: PHOTO_B.id }]);
    expect(newFiles).toEqual([file]);
  });

  /** 下标按最终顺序现算：先加后面再挪到前面，仍然指向正确的那个文件 */
  it("新文件挪到最前面之后，newFile 的下标跟着重算", async () => {
    const wrapper = mountDialog(work([PHOTO_A]));
    const added = png("c.png");

    await addFiles(wrapper, [added]);
    await wrapper.find(".media-row:nth-child(2) .media-move-up").trigger("click");
    await save(wrapper);

    const { items, newFiles } = submitted(wrapper);
    expect(items).toEqual([{ newFile: 0 }, { mediaId: PHOTO_A.id }]);
    expect(newFiles).toEqual([added]);
  });

  it("原样打开直接保存不发请求，只提示未修改", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await save(wrapper);

    expect(wrapper.emitted("submit")).toBeFalsy();
    expect(window.$vmessage.info).toHaveBeenCalledWith("未修改任何内容");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("只挪了顺序也算改动", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));

    await wrapper.find(".media-row:nth-child(2) .media-move-up").trigger("click");
    await save(wrapper);

    expect(wrapper.emitted("submit")).toHaveLength(1);
  });
});

describe("GalleryEditDialog 的预览地址", () => {
  it("移除带预览的条目会释放它的地址", async () => {
    const wrapper = mountDialog(work([PHOTO_A, PHOTO_B]));
    await pickReplacement(wrapper, 0, png("new.png"));

    await wrapper.find(".media-row:nth-child(1) .media-remove").trigger("click");

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:new.png");
  });

  it("同一行再换一次文件时释放上一次的地址", async () => {
    const wrapper = mountDialog(work([PHOTO_A]));
    await pickReplacement(wrapper, 0, png("first.png"));

    await pickReplacement(wrapper, 0, png("second.png"));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first.png");
  });

  it("关掉弹窗释放草稿里所有预览地址", async () => {
    const wrapper = mountDialog(work([PHOTO_A]));
    await addFiles(wrapper, [png("c.png")]);

    await wrapper.setProps({ visible: false });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:c.png");
  });

  it("组件卸载时释放草稿里所有预览地址", async () => {
    const wrapper = mountDialog(work([PHOTO_A]));
    await addFiles(wrapper, [png("c.png")]);

    wrapper.unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:c.png");
  });
});

describe("GalleryEditDialog 的背景音乐", () => {
  const WITH_BGM = {
    bgmSrc: "https://cdn.example.test/music/old.mp3",
    bgmType: "audio",
  };

  /**
   * 后端规则 3：音乐项自己就是音源，配 BGM 会被整条请求 400 拒掉，编辑会整个失败。
   * 选择器只在这一项上收起来，保存根本发不出这套组合。
   */
  it("音乐项不显示选曲面板", () => {
    expect(mountDialog({ type: "music" }).findComponent({ name: "GalleryBgmPicker" }).exists()).toBe(false);
  });

  /**
   * 视频项要显示选曲面板 —— 视频原声与 BGM 同时出声是明确的产品要求。
   *
   * 收起来会变成死胡同：新建时给视频配了 BGM，之后在编辑弹窗里既看不到、
   * 也没有入口改或清，这个作品从此只能被删掉。
   */
  it("photo / gif / video 项显示选曲面板", () => {
    const picker = (type) => mountDialog({ type }).findComponent({ name: "GalleryBgmPicker" });

    expect(picker("photo").exists()).toBe(true);
    expect(picker("gif").exists()).toBe(true);
    expect(picker("video").exists()).toBe(true);
  });

  it("打开时回填当前配的曲子", () => {
    const wrapper = mountDialog(work([PHOTO_A], WITH_BGM));

    expect(wrapper.findComponent({ name: "GalleryBgmPicker" }).props("modelValue")).toEqual({
      src: "https://cdn.example.test/music/old.mp3", type: "audio",
    });
  });

  /** 全量替换：没改也要照原样发回去，省略等于清空 */
  it("没改 BGM 时把原来那首照原样发回去", async () => {
    const wrapper = mountDialog(work([PHOTO_A], WITH_BGM));

    await textFields(wrapper)[0].setValue("新标题");
    await save(wrapper);

    expect(submitted(wrapper)).toMatchObject({
      bgmSrc: "https://cdn.example.test/music/old.mp3",
      bgmType: "audio",
    });
  });

  it("改了 BGM 时两个字段一起提交", async () => {
    const wrapper = mountDialog(work([PHOTO_A]));

    await wrapper.find(".bgm-stub").trigger("click");
    await save(wrapper);

    expect(submitted(wrapper)).toMatchObject({
      bgmSrc: "https://cdn.example.test/music/new.mp3",
      bgmType: "audio",
    });
  });

  /** 清空要发两个 null，只发一个会被服务端当成参数不完整而拒绝整次编辑 */
  it("取消背景音乐时两个字段都发 null", async () => {
    const wrapper = mountDialog(work([PHOTO_A], WITH_BGM));

    await wrapper.findComponent({ name: "GalleryBgmPicker" }).vm.$emit("update:modelValue", null);
    await save(wrapper);

    expect(submitted(wrapper)).toMatchObject({ bgmSrc: null, bgmType: null });
  });

  it("没有配 BGM 的作品保存时发两个 null，而不是省略字段", async () => {
    const wrapper = mountDialog(work([PHOTO_A]));

    await textFields(wrapper)[0].setValue("新标题");
    await save(wrapper);

    expect(submitted(wrapper)).toMatchObject({ bgmSrc: null, bgmType: null });
  });
});
