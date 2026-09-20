import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveBgm, useGalleryBgm } from "@/modules/gallery/composables/useGalleryBgm";
import { pauseForBgm, registerPlayerAudio } from "@/modules/player/composables/useAudioPlayer";

const PHOTO_WITH_BGM = {
  id: 1, type: "photo", src: "https://cdn.example.test/imgs/a.png",
  bgmSrc: "https://cdn.example.test/music/song.mp3", bgmType: "audio",
};
const PLAIN_PHOTO = { id: 4, type: "photo", src: "https://cdn.example.test/imgs/d.png" };

/** 够用的媒体元素替身：被测代码只碰 loop / src / play / pause 四样 */
function fakeElement(tag) {
  return { tag, loop: false, src: "", play: vi.fn(() => Promise.resolve()), pause: vi.fn() };
}

/** 造一个 composable，并记下它建过哪些元素（顺序就是建的顺序） */
function mountBgm({ playerPaused = true } = {}) {
  const created = [];
  const player = { paused: playerPaused, pause: vi.fn(), play: vi.fn(() => Promise.resolve()) };
  registerPlayerAudio(player);
  const bgm = useGalleryBgm((tag) => {
    const el = fakeElement(tag);
    created.push(el);
    return el;
  });
  return { bgm, created, player };
}

describe("resolveBgm", () => {
  it("配过 BGM 的图文项用它配的那一首", () => {
    expect(resolveBgm(PHOTO_WITH_BGM)).toEqual({
      src: "https://cdn.example.test/music/song.mp3", type: "audio",
    });
  });

  it("音乐项用自己，类型是 audio", () => {
    expect(resolveBgm({ id: 2, type: "music", src: "https://cdn.example.test/music/b.mp3" }))
      .toEqual({ src: "https://cdn.example.test/music/b.mp3", type: "audio" });
  });

  it("视频项用自己，类型是 video", () => {
    expect(resolveBgm({ id: 3, type: "video", src: "https://cdn.example.test/video/c.mp4" }))
      .toEqual({ src: "https://cdn.example.test/video/c.mp4", type: "video" });
  });

  /** 没配 BGM 的图就是没有可播的东西，不是「拿图当音源」 */
  it("没配 BGM 的图文项没有可播的东西", () => {
    expect(resolveBgm(PLAIN_PHOTO)).toBe(null);
    expect(resolveBgm({ id: 5, type: "gif", src: "https://cdn.example.test/gif/e.gif" })).toBe(null);
    expect(resolveBgm(null)).toBe(null);
  });
});

describe("useGalleryBgm 的播放", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("audio 类型建 audio 元素、开循环、设地址", () => {
    const { bgm, created } = mountBgm();

    bgm.play(PHOTO_WITH_BGM);

    expect(created).toHaveLength(1);
    expect(created[0].tag).toBe("audio");
    expect(created[0].loop).toBe(true);
    expect(created[0].src).toBe("https://cdn.example.test/music/song.mp3");
    expect(created[0].play).toHaveBeenCalledTimes(1);
    expect(bgm.activeBgm.value).toEqual({
      src: "https://cdn.example.test/music/song.mp3", type: "audio",
    });
  });

  /** G7 的闸：视频当 BGM 时元素根本不在文档里，不可能显示画面 */
  it("video 类型建 video 元素，且元素不进 DOM", () => {
    const { bgm, created } = mountBgm();

    bgm.play({ id: 3, type: "video", src: "https://cdn.example.test/video/c.mp4" });

    expect(created[0].tag).toBe("video");
    expect(document.querySelector("video")).toBe(null);
  });

  /**
   * 「gallery 是什么音量就是什么音量」。
   *
   * 一旦有人写 el.volume = 0.3，volume 就不再是 undefined，这条立刻变红。
   */
  it("不设置音量", () => {
    const { bgm, created } = mountBgm();

    bgm.play(PHOTO_WITH_BGM);

    expect(created[0].volume).toBeUndefined();
  });

  it("停止时暂停并清空状态", () => {
    const { bgm, created } = mountBgm();
    bgm.play(PHOTO_WITH_BGM);

    bgm.stop();

    expect(created[0].pause).toHaveBeenCalledTimes(1);
    expect(bgm.activeBgm.value).toBe(null);
    expect(bgm.activeId.value).toBe(null);
  });

  /** 重渲染不该让曲子从头再放一遍 */
  it("同一条项再播一次不重新起播", () => {
    const { bgm, created } = mountBgm();
    bgm.play(PHOTO_WITH_BGM);

    bgm.play(PHOTO_WITH_BGM);

    expect(created).toHaveLength(1);
  });

  it("换另一条项会停掉前一个元素", () => {
    const { bgm, created } = mountBgm();
    bgm.play(PHOTO_WITH_BGM);

    bgm.play({ id: 9, type: "music", src: "https://cdn.example.test/music/z.mp3" });

    expect(created[0].pause).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(2);
    expect(created[1].src).toBe("https://cdn.example.test/music/z.mp3");
  });

  it("打开没有 BGM 的项会停掉正在播的那一首", () => {
    const { bgm, created } = mountBgm();
    bgm.play(PHOTO_WITH_BGM);

    bgm.play(PLAIN_PHOTO);

    expect(created[0].pause).toHaveBeenCalledTimes(1);
    expect(bgm.activeBgm.value).toBe(null);
  });

  /** 没在播的时候调 stop 是空操作，不该把侧栏的让位状态冲掉 */
  it("没在播时停止是空操作，不碰侧栏", () => {
    const { bgm, player } = mountBgm({ playerPaused: false });
    // 先真的让一次位，把模块级的 wasPlayingBeforeBgm 置为 true。
    // 少了这一句，stop() 开头那道守卫被删掉也测不出来：resumeAfterBgm
    // 会因为该标志是上一条用例遗留的 false 而提前返回，player.play 照样不被调用。
    pauseForBgm();

    bgm.stop();

    expect(player.play).not.toHaveBeenCalled();
  });

  it("playSource 直接播一对地址与类型，用于刚上传完的试听", () => {
    const { bgm, created } = mountBgm();

    bgm.playSource({ src: "https://cdn.example.test/music/new.mp3", type: "audio" });

    expect(created[0].src).toBe("https://cdn.example.test/music/new.mp3");
    expect(created[0].tag).toBe("audio");
  });

  it("地址为空时 playSource 退化成停止", () => {
    const { bgm, created } = mountBgm();

    bgm.playSource({ src: "", type: "audio" });

    expect(created).toHaveLength(0);
    expect(bgm.activeBgm.value).toBe(null);
  });

  /** 起播失败只意味着没声音，不该让打开详情这一步出错 */
  it("起播被拒时不抛异常", () => {
    registerPlayerAudio(null);
    const bgm = useGalleryBgm(() => ({
      loop: false, src: "", pause: vi.fn(),
      play: vi.fn(() => Promise.reject(new Error("blocked"))),
    }));

    expect(() => bgm.play(PHOTO_WITH_BGM)).not.toThrow();
  });
});

describe("useGalleryBgm 与侧栏的协调", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("起播时让侧栏让位，停止时还原", () => {
    const { bgm, player } = mountBgm({ playerPaused: false });

    bgm.play(PHOTO_WITH_BGM);
    expect(player.pause).toHaveBeenCalledTimes(1);

    bgm.stop();
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  /** 侧栏本来就没在播，关掉详情不该擅自开始放 */
  it("侧栏原本没在播时不做任何事", () => {
    const { bgm, player } = mountBgm({ playerPaused: true });

    bgm.play(PHOTO_WITH_BGM);
    bgm.stop();

    expect(player.pause).not.toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
  });

  /** 打开一条没有 BGM 的项不该让侧栏停一下再恢复 */
  it("打开没有 BGM 的项不惊动侧栏", () => {
    const { bgm, player } = mountBgm({ playerPaused: false });

    bgm.play(PLAIN_PHOTO);

    expect(player.pause).not.toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
  });

  /**
   * **谁开的窗口谁关。**
   *
   * 侧栏已经被**另一个实例**让位时（详情弹窗在播），本实例（编辑弹窗里的
   * 选择器试听）的让位是空转 —— 它没开过窗口，就无权去关。少了这一条，
   * 关掉编辑弹窗会把侧栏解停，而详情弹窗的 BGM 还在播，**两路音频一起响**。
   *
   * 不用 `mountBgm`：那会再登记一个新侧栏元素。真实应用里两个实例
   * 共用同一个侧栏，所以这里只手写一个有状态的替身、只登记一次。
   * `pause()` 必须真翻转 `paused`，否则模拟不出「侧栏已被别人按下去」。
   */
  it("侧栏已被别的实例让位时，本实例停止不解停侧栏", () => {
    const player = {
      paused: false,
      pause: vi.fn(() => {
        player.paused = true;
      }),
      play: vi.fn(() => {
        player.paused = false;
        return Promise.resolve();
      }),
    };
    registerPlayerAudio(player);

    const newBgm = () => useGalleryBgm((tag) => fakeElement(tag));

    const dialog = newBgm();
    dialog.play(PHOTO_WITH_BGM); // 详情弹窗接管侧栏
    expect(player.pause).toHaveBeenCalledTimes(1);

    const picker = newBgm();
    picker.playSource({ src: "https://cdn.example.test/music/new.mp3", type: "audio" });
    picker.stop(); // 关掉编辑弹窗 —— 不该解停侧栏

    expect(player.play).not.toHaveBeenCalled();

    dialog.stop(); // 详情弹窗关闭 —— 这时才该恢复

    expect(player.play).toHaveBeenCalledTimes(1);
  });

  /**
   * **同一实例内换过项，第一次开的窗口仍然算数。**
   *
   * 详情弹窗从一条带 BGM 的项换到下一条时，`playSource` 会第二次让位；但侧栏
   * 已经是被本实例按下去的，这一让是空转，`pauseForBgm()` 返回 `false`。若把
   * 这个 `false` 直接赋回 `openedWindow`（少了 sticky-OR），本实例就「忘了」
   * 自己开过窗口，`stop()` 便不再解停侧栏 —— 用户关掉弹窗后侧栏音乐**静默消失**，
   * 正是 `9e4ae7b` 修过的那一类缺陷。所以这里断言换项之后的停止仍然恢复侧栏。
   *
   * `pause()` 必须真翻转 `paused`：无状态的替身会让第二次让位走成「真的接管」
   * 分支，这条用例就绕开了 sticky-OR，测不到它。
   */
  it("同一实例内换过项之后停止，仍然恢复侧栏", () => {
    const player = {
      paused: false,
      pause: vi.fn(() => {
        player.paused = true;
      }),
      play: vi.fn(() => {
        player.paused = false;
        return Promise.resolve();
      }),
    };
    registerPlayerAudio(player);

    const bgm = useGalleryBgm((tag) => fakeElement(tag));

    bgm.play(PHOTO_WITH_BGM); // 第一次让位：接管侧栏
    bgm.playSource({ src: "https://cdn.example.test/music/next.mp3", type: "audio" }); // 换项：第二次让位空转
    bgm.stop();

    expect(player.pause).toHaveBeenCalledTimes(1); // 第二次让位确实空转，没重复接管
    expect(player.play).toHaveBeenCalledTimes(1); // 仍然恢复侧栏
  });
});
