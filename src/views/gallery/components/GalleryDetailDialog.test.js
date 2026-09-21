import { mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GalleryDetailDialog from "@/views/gallery/components/GalleryDetailDialog.vue";

// useGalleryBgm 换成替身：这一层要断言的是「弹窗什么时候让它播、什么时候让它停」，
// 播放本身（建元素、循环、音量、与侧栏协调）由 useGalleryBgm.test.js 负责。
// 而真实实现会在 jsdom 里建真的媒体元素，那既没解码器、也不是本文件的被测对象。
// activeBgm 由各用例按需设置：曲名兜底那组要断言「拿不到曲名时显示什么」
const bgmSpies = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn(), activeBgm: { value: null } }));

vi.mock("@/modules/gallery/composables/useGalleryBgm", () => ({
  useGalleryBgm: () => ({
    activeBgm: bgmSpies.activeBgm,
    activeId: { value: null },
    play: bgmSpies.play,
    playSource: vi.fn(),
    stop: bgmSpies.stop,
  }),
}));

const ITEM = { id: 1, type: "photo", src: "/a.jpg", title: "标题", description: "描述" };

function mountDialog(props = {}) {
  return mount(GalleryDetailDialog, {
    props: {
      item: ITEM,
      threads: [],
      comment: "",
      replyTo: null,
      expandedThreads: new Set(),
      formatDate: () => "2026/9/12 10:00:00",
      formatShortDate: () => "2026/9/12",
      ...props,
    },
  });
}

function touchEvent(type, clientY) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", { value: [{ clientY }] });
  return event;
}

describe("GalleryDetailDialog 拖动调整高度", () => {
  it("鼠标按下时派发 resize-start，交给页面的拖拽逻辑处理", async () => {
    const wrapper = mountDialog();

    await wrapper.find(".resize-handle").trigger("mousedown");

    expect(wrapper.emitted("resize-start")).toHaveLength(1);
  });

  it("触摸拖动会改变描述区高度", async () => {
    const wrapper = mountDialog();
    const description = wrapper.find(".detail-desc").element;

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 100));
    document.dispatchEvent(touchEvent("touchmove", 300));

    expect(description.style.height).toBe("200px");
  });

  it("高度上限为视口高度的一半", async () => {
    const wrapper = mountDialog();
    const description = wrapper.find(".detail-desc").element;

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 0));
    document.dispatchEvent(touchEvent("touchmove", 5000));

    expect(description.style.height).toBe(`${window.innerHeight * 0.5}px`);
  });

  it("高度下限为 60px", async () => {
    const wrapper = mountDialog();
    const description = wrapper.find(".detail-desc").element;

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 100));
    document.dispatchEvent(touchEvent("touchmove", 10));

    expect(description.style.height).toBe("60px");
  });

  it("触摸结束后不再跟随移动", async () => {
    const wrapper = mountDialog();
    const description = wrapper.find(".detail-desc").element;

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 100));
    document.dispatchEvent(touchEvent("touchmove", 300));
    document.dispatchEvent(touchEvent("touchend", 300));
    document.dispatchEvent(touchEvent("touchmove", 800));

    expect(description.style.height).toBe("200px");
  });

  it("没有触摸点时忽略 touchstart", () => {
    const wrapper = mountDialog();
    const description = wrapper.find(".detail-desc").element;

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 100));
    wrapper.find(".resize-handle").element.dispatchEvent(new Event("touchstart"));
    document.dispatchEvent(touchEvent("touchmove", 300));

    expect(description.style.height).toBe("200px");
  });

  it("组件卸载时移除监听，避免遗留全局事件", () => {
    const wrapper = mountDialog();
    const removeSpy = vi.spyOn(document, "removeEventListener");

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 100));
    wrapper.unmount();

    expect(removeSpy).toHaveBeenCalledWith("touchmove", expect.any(Function));
  });
});

describe("GalleryDetailDialog 的回复", () => {
  const ROOT = {
    id: 1, username: "甲", content: "顶层评论", likes: 0,
    createdAt: "2026-01-01T10:00:00", replies: [],
  };
  const REPLY = {
    id: 2, username: "乙", content: "回复内容", likes: 0,
    createdAt: "2026-01-01T11:00:00", replyToName: "甲",
  };
  const THREAD = { ...ROOT, replies: [REPLY] };

  it("每条评论都有回复按钮，点了把这条评论抛出去", async () => {
    // 折叠时只渲染根评论，展开后子评论也各自带上回复入口
    expect(mountDialog({ threads: [THREAD] }).findAll(".comment-reply-btn")).toHaveLength(1);

    const wrapper = mountDialog({ threads: [THREAD], expandedThreads: new Set(["1"]) });
    const buttons = wrapper.findAll(".comment-reply-btn");
    expect(buttons).toHaveLength(2);
    await buttons[0].trigger("click");

    expect(wrapper.emitted("reply")[0][0]).toMatchObject({ id: 1, username: "甲" });
  });

  it("没有回复对象时不显示回复条", () => {
    expect(mountDialog({ threads: [THREAD] }).find(".reply-banner").exists()).toBe(false);
  });

  it("有回复对象时显示回复了谁，取消按钮抛 cancel-reply", async () => {
    const wrapper = mountDialog({ threads: [THREAD], replyTo: { id: 1, username: "甲" } });

    expect(wrapper.find(".reply-banner").text()).toContain("甲");
    await wrapper.find(".reply-cancel").trigger("click");

    expect(wrapper.emitted("cancel-reply")).toHaveLength(1);
  });

  it("有回复的评论默认折叠，只亮出一个展开按钮", () => {
    const wrapper = mountDialog({ threads: [THREAD] });

    expect(wrapper.find(".comment-reply-item").exists()).toBe(false);
    expect(wrapper.find(".comment-replies-toggle").text()).toContain("展开回复");
  });

  it("没有回复的评论不出现展开按钮", () => {
    const wrapper = mountDialog({ threads: [{ ...ROOT, replies: [] }] });

    expect(wrapper.find(".comment-replies-toggle").exists()).toBe(false);
  });

  it("展开后子评论缩进渲染，并标出回复的是谁", () => {
    const wrapper = mountDialog({ threads: [THREAD], expandedThreads: new Set(["1"]) });

    const replies = wrapper.findAll(".comment-reply-item");
    expect(replies).toHaveLength(1);
    expect(replies[0].text()).toContain("回复 @甲");
  });

  it("展开状态下按钮变成收起", () => {
    const wrapper = mountDialog({ threads: [THREAD], expandedThreads: new Set(["1"]) });

    expect(wrapper.find(".comment-replies-toggle").text()).toContain("收起回复");
  });

  /** 展开状态由页面持有，弹窗只负责把点击抛出去 */
  it("点展开按钮抛出 toggle-replies 并带上根评论 id", async () => {
    const wrapper = mountDialog({ threads: [THREAD] });

    await wrapper.find(".comment-replies-toggle").trigger("click");

    expect(wrapper.emitted("toggle-replies")[0]).toEqual([1]);
  });

  it("评论数把折叠中的回复也计入", () => {
    const wrapper = mountDialog({ threads: [THREAD] });

    expect(wrapper.find(".comments-scrollable h3").text()).toContain("2");
  });
});

describe("GalleryDetailDialog 的评论加载失败", () => {
  const THREAD = {
    id: 1, username: "甲", content: "上次取到的评论", likes: 0,
    createdAt: "2026-01-01T10:00:00", replies: [],
  };

  /**
   * 取不到评论不等于这条资源没有评论。空列表把失败渲染成事实，
   * 还会和卡片上的评论数对不上。
   */
  it("取不到评论时说明失败，不说没有评论", () => {
    const wrapper = mountDialog({ item: { ...ITEM, commentsLoadFailed: true, commentCount: 2 } });
    const text = wrapper.text();

    expect(text).toContain("评论加载失败");
    expect(text).not.toContain("There's no comment.");
  });

  /** 服务端确实返回了空列表时，「没有评论」是事实，照常显示 */
  it("确实没有评论时照常显示没有评论", () => {
    const wrapper = mountDialog({ item: { ...ITEM, commentsLoadFailed: false } });

    expect(wrapper.find(".no-comment").text()).toBe("There's no comment.");
    expect(wrapper.find(".comment-error").exists()).toBe(false);
  });

  /** 刷新失败时上一次取到的评论还在，不能为了说明失败把它们藏起来 */
  it("取不到评论但还有上次的评论时，评论照常显示", () => {
    const wrapper = mountDialog({ item: { ...ITEM, commentsLoadFailed: true }, threads: [THREAD] });

    expect(wrapper.findAll(".comment-item")).toHaveLength(1);
    expect(wrapper.find(".comment-error").exists()).toBe(true);
    expect(wrapper.find(".no-comment").exists()).toBe(false);
  });

  /** 列表不可信时退回这一条自带的计数，不能顶着 0 去说加载失败 */
  it("取不到评论时标题用这一条自带的评论数", () => {
    const wrapper = mountDialog({ item: { ...ITEM, commentsLoadFailed: true, commentCount: 2 } });

    expect(wrapper.find(".comments-scrollable h3").text()).toBe("Comments(2)");
  });
});

describe("GalleryDetailDialog 的背景音乐", () => {
  const WITH_BGM = {
    ...ITEM,
    bgmSrc: "https://cdn.example.test/music/a.mp3",
    bgmType: "audio",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("打开一条项就把播放交给 useGalleryBgm", () => {
    mountDialog({ item: WITH_BGM });

    expect(bgmSpies.play).toHaveBeenCalledWith(expect.objectContaining({ id: WITH_BGM.id }));
  });

  /** 音乐项自己的 `<audio controls>` 就在同一屏；再起一个隐藏元素是同一个文件两路解码 */
  it("音乐项不起隐藏播放", () => {
    mountDialog({ item: { ...ITEM, type: "music", src: "https://cdn.example.test/music/b.mp3" } });

    expect(bgmSpies.play).not.toHaveBeenCalled();
    // 这种项走的是 else 分支：上一首的隐藏元素若还在，必须在这里被收掉
    expect(bgmSpies.stop).toHaveBeenCalled();
  });

  /** 视频项两边都 autoplay，叠音；隐藏那个没有控件，用户停不掉 */
  it("视频项不起隐藏播放", () => {
    mountDialog({ item: { ...ITEM, type: "video", src: "https://cdn.example.test/video/c.mp4" } });

    expect(bgmSpies.play).not.toHaveBeenCalled();
    expect(bgmSpies.stop).toHaveBeenCalled();
  });

  /** 弹窗没了音乐还在响，用户找不到地方关它 */
  it("关闭时停掉背景音乐", async () => {
    const wrapper = mountDialog({ item: WITH_BGM });
    bgmSpies.stop.mockClear();

    await wrapper.setProps({ item: null });

    expect(bgmSpies.stop).toHaveBeenCalled();
  });

  /**
   * 页面保存编辑是**就地**改这一条（`useGalleryPage` 的 `applyEditedFields`
   * 用 `Object.assign` 改列表与详情里的同一个对象），引用不变。监听如果按
   * 对象比对就永远不触发：界面显示「未设置」，隐藏元素却继续播到弹窗关闭。
   */
  it("详情开着时清空背景音乐，声音立刻停", async () => {
    const item = reactive({ ...WITH_BGM });
    mountDialog({ item });
    bgmSpies.stop.mockClear();

    Object.assign(item, { bgmSrc: null, bgmType: null });
    await nextTick();

    expect(bgmSpies.stop).toHaveBeenCalled();
  });

  /** 同一条项换了曲子也要重新交给播放：只比 id 的话这里会停在旧的那一首 */
  it("详情开着时换一条曲子，会重新交给播放", async () => {
    const wrapper = mountDialog({ item: WITH_BGM });
    bgmSpies.play.mockClear();

    await wrapper.setProps({
      item: { ...WITH_BGM, bgmSrc: "https://cdn.example.test/music/b.mp3" },
    });

    expect(bgmSpies.play).toHaveBeenCalledTimes(1);
  });

  /** 父组件用 v-if 摘掉整个弹窗是常见做法，那时 props 不会再变 */
  it("组件卸载时停掉背景音乐", () => {
    const wrapper = mountDialog({ item: WITH_BGM });
    bgmSpies.stop.mockClear();

    wrapper.unmount();

    expect(bgmSpies.stop).toHaveBeenCalled();
  });
});

describe("GalleryDetailDialog 显示的曲名", () => {
  const WITH_OSS_SRC = {
    ...ITEM,
    bgmSrc: "https://cdn.example.test/music/a18778e1-f6a9-4902-b967-a86ebcca8858.mp3",
    bgmType: "audio",
  };

  beforeEach(() => {
    bgmSpies.activeBgm.value = null;
  });

  /** OSS 上存的是 UUID 文件名，摆给用户看等于什么都没说 */
  it("只有 UUID 文件名时显示中性占位", () => {
    bgmSpies.activeBgm.value = { id: WITH_OSS_SRC.id, src: WITH_OSS_SRC.bgmSrc };

    const wrapper = mountDialog({ item: WITH_OSS_SRC });

    expect(wrapper.find(".bgm-name").text()).toBe("背景音乐");
  });

  it("文件名是时间戳这类机器名时同样显示占位", () => {
    const src = "https://cdn.example.test/music/1758412800000.mp3";
    bgmSpies.activeBgm.value = { id: WITH_OSS_SRC.id, src };

    const wrapper = mountDialog({ item: { ...WITH_OSS_SRC, bgmSrc: src } });

    expect(wrapper.find(".bgm-name").text()).toBe("背景音乐");
  });

  it("后端给了 bgmTitle 就用它", () => {
    bgmSpies.activeBgm.value = { id: WITH_OSS_SRC.id, src: WITH_OSS_SRC.bgmSrc };

    const wrapper = mountDialog({ item: { ...WITH_OSS_SRC, bgmTitle: "夏夜" } });

    expect(wrapper.find(".bgm-name").text()).toBe("夏夜");
  });

  /** 占位只针对机器名；上传者自己起的可读文件名照常显示 */
  it("地址末段是可读文件名时照常显示", () => {
    const src = "https://cdn.example.test/music/夏夜.mp3";
    bgmSpies.activeBgm.value = { id: WITH_OSS_SRC.id, src };

    const wrapper = mountDialog({ item: { ...WITH_OSS_SRC, bgmSrc: src } });

    expect(wrapper.find(".bgm-name").text()).toBe("夏夜");
  });
});
