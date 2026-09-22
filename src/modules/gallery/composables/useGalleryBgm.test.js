import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveBgmElement, resolveBgm, useGalleryBgm } from "@/modules/gallery/composables/useGalleryBgm";
import { pauseForBgm, registerPlayerAudio } from "@/modules/player/composables/useAudioPlayer";

// 全站音量层换成替身：这一层要断言的是「元素有没有被交出去、有没有被交回来」，
// 写音量本身（登记时写一次、拖滑块时写一次）由 mediaVolume.test.js 负责。
// 部分替身：同一个模块里别的东西（getVolume / setVolume）还由侧栏播放器按原样用着。
vi.mock("@/modules/player/composables/mediaVolume", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    registerMediaElement: vi.fn(),
    unregisterMediaElement: vi.fn(),
  };
});

import { registerMediaElement, unregisterMediaElement } from "@/modules/player/composables/mediaVolume";

const PHOTO_WITH_BGM = {
  id: 1, type: "photo", src: "https://cdn.example.test/imgs/a.png",
  bgmSrc: "https://cdn.example.test/music/song.mp3", bgmType: "audio",
};
const PLAIN_PHOTO = { id: 4, type: "photo", src: "https://cdn.example.test/imgs/d.png" };

/** 够用的媒体元素替身：被测代码只碰 loop / src / setAttribute / play / pause 几样 */
function fakeElement(tag) {
  return {
    tag,
    loop: false,
    src: "",
    // 属性只记下来、不解析：视频型 BGM 要写 playsinline，而 iOS 的渲染行为在这里
    // 断言不了（jsdom 没有那套逻辑）。但少了这个方法，建元素那一步会直接抛
    setAttribute: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
  };
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
   * 原先的规则是「按源文件原始音量，一个字节都不设 volume」。
   * 全站音量收敛到右栏一个滑块之后那条规则作废：这里必须登记元素，
   * 由 mediaVolume 按当前音量写一次 —— 不登记的话这首曲子会以浏览器的
   * 默认音量（1.0）出声，而用户明明把滑块调到了 30%。
   */
  it("plays at the shared volume instead of the source file's own volume", () => {
    const { bgm, created } = mountBgm();

    bgm.play(PHOTO_WITH_BGM);

    expect(registerMediaElement).toHaveBeenCalledWith(created[0]);
  });

  /**
   * 登记表是模块级的、持有的是元素本身，而这个元素是 createElement 建的、
   * 从不进 DOM：外面没有别的引用会放开它。停止与换项都会销毁它，两处都要交回去。
   */
  it("交回音量层：停止与换项都注销已经销毁的元素", () => {
    const { bgm, created } = mountBgm();

    bgm.play(PHOTO_WITH_BGM);
    bgm.play({ id: 9, type: "music", src: "https://cdn.example.test/music/z.mp3" });
    bgm.stop();

    expect(unregisterMediaElement).toHaveBeenCalledWith(created[0]);
    expect(unregisterMediaElement).toHaveBeenCalledWith(created[1]);
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

  /**
   * **详情弹窗按 (id, bgmSrc, bgmType) 监听留下的坑。**
   *
   * 同一条项换了曲子，`playSource` 会带着同一个 id、另一个地址再来一次。
   * 身份只比 id 的旧式去重会把它当成「同一条不重复起播」直接返回 ——
   * 用户挑的新曲子不响，响的还是旧的那一首，而且界面已经显示成新的了。
   */
  it("同一条项换了曲子照样换播", () => {
    const { bgm, created } = mountBgm();
    const SWAPPED = { ...PHOTO_WITH_BGM, bgmSrc: "https://cdn.example.test/music/other.mp3" };

    bgm.play(PHOTO_WITH_BGM);
    bgm.play(SWAPPED);

    expect(created[0].pause).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(2);
    expect(created[1].src).toBe("https://cdn.example.test/music/other.mp3");
    expect(bgm.activeBgm.value).toEqual({
      src: "https://cdn.example.test/music/other.mp3", type: "audio",
    });
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
    // 先真的让一次位，把模块级的 wasPlayingBeforeBgm 置为 true：少了这一句，
    // 「没开过窗口就不解停侧栏」那道 openedWindow 守卫被删掉也测不出来
    // （resumeAfterBgm 会因该标志为 false 提前返回，player.play 照样不被调用）。
    //
    // 它**测不出** stop() 开头那道早退守卫：本实例从没播过，openedWindow 本就是
    // false，8650e5e 把「谁开的窗口谁关」交给 openedWindow 之后，去掉那道 return
    // 也不改变这里的任何可观察行为。
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
   * 本实例没开过窗口，就无权解停侧栏 —— 否则用户没碰过的声音会被放出来。
   *
   * 这一段原来靠「详情弹窗在播、选择器再试听」来造状态。有了单实例仲裁之后
   * 那个状态不再存在：选择器起播会先把详情弹窗停掉，详情弹窗的停止本身就会
   * 解停侧栏。所以这里改用模块级的让位函数直接摆出「窗口已经被别人开着」——
   * 侧栏被按了下去，而本实例从没开过窗口。
   *
   * 不用 `mountBgm`：那会再登记一个新侧栏元素。真实应用里两个实例
   * 共用同一个侧栏，所以这里只手写一个有状态的替身、只登记一次。
   * `pause()` 必须真翻转 `paused`，否则模拟不出「侧栏已被按下去」。
   */
  it("窗口已被别人开着时，本实例停止不解停侧栏", () => {
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

    pauseForBgm(); // 别人开的窗口：侧栏原本在播，被按了下去
    expect(player.pause).toHaveBeenCalledTimes(1);

    const picker = useGalleryBgm((tag) => fakeElement(tag));
    picker.playSource({ src: "https://cdn.example.test/music/new.mp3", type: "audio" });
    picker.stop(); // 关掉编辑弹窗 —— 不该解停侧栏

    expect(player.play).not.toHaveBeenCalled();
  });

  /**
   * **同一时刻只准一个实例出声。**
   *
   * 详情弹窗开着时从它里面打开编辑弹窗试听，是两个实例各建各的元素：
   * 少了仲裁就是两路音频一起响，而且没有控件解释多出来的那一路。
   *
   * 仲裁的手法是**按停**对方（理由见「试听期间的让位与恢复」那一组）：对方只是
   * 不出声，元素与播放状态都留在原处，试听一停就接着放。侧栏则始终由详情弹窗
   * 那一次让位持有 —— 试听这一路按不动它（`pauseForBgm()` 空转），也就不许解停。
   */
  it("另一个实例起播时先让正在响的那一个让位", () => {
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

    // 两个实例共用同一个侧栏，各自记下自己建过的元素
    const elements = [];
    const newBgm = () => {
      const made = [];
      elements.push(made);
      return useGalleryBgm((tag) => {
        const el = fakeElement(tag);
        made.push(el);
        return el;
      });
    };

    const dialog = newBgm();
    dialog.play(PHOTO_WITH_BGM); // 详情弹窗接管侧栏
    expect(player.pause).toHaveBeenCalledTimes(1);

    const picker = newBgm();
    picker.playSource({ src: "https://cdn.example.test/music/new.mp3", type: "audio" });

    // 详情弹窗那一路不出声了，但只是被按停：曲子还在它名下，元素也没销毁
    expect(elements[0][0].pause).toHaveBeenCalledTimes(1);
    expect(dialog.paused.value).toBe(true);
    expect(dialog.activeBgm.value).not.toBe(null);
    // 侧栏：详情弹窗按下去过一次。选择器这一让是空转（按不下去已经被按住的），
    // 不出现「解停再按停」那一下
    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(player.play).not.toHaveBeenCalled();

    picker.stop(); // 试听结束：详情弹窗那一首接着放

    expect(elements[0][0].play).toHaveBeenCalledTimes(2);
    expect(dialog.paused.value).toBe(false);
    // 详情弹窗还在响，侧栏就该继续闭嘴 —— 窗口是详情弹窗开的，还没到还的时候
    expect(player.play).not.toHaveBeenCalled();

    dialog.stop(); // 关掉详情：这次该它还原侧栏

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
  it("pause 保留进度、resume 从原处接着放，不是 stop 那种销毁重来", () => {
    const el = fakeElement();
    const bgm = useGalleryBgm(() => el);

    bgm.playSource({ src: "https://cdn/a.mp3", type: "audio" });
    expect(bgm.paused.value).toBe(false);

    bgm.toggle();
    expect(bgm.paused.value).toBe(true);
    expect(el.pause).toHaveBeenCalled();
    // 关键区别：元素还在，activeBgm 没被清空 —— stop() 会把它清掉
    expect(bgm.activeBgm.value).not.toBeNull();

    const playCalls = el.play.mock.calls.length;
    bgm.toggle();
    expect(bgm.paused.value).toBe(false);
    expect(el.play.mock.calls.length).toBe(playCalls + 1);
    expect(bgm.activeBgm.value).not.toBeNull();
  });

  it("换一条项起播时，暂停态会被重置", () => {
    const el = fakeElement();
    const bgm = useGalleryBgm(() => el);

    bgm.playSource({ src: "https://cdn/a.mp3", type: "audio" }, 1);
    bgm.pause();
    expect(bgm.paused.value).toBe(true);

    bgm.playSource({ src: "https://cdn/b.mp3", type: "audio" }, 2);
    expect(bgm.paused.value).toBe(false);
  });

});

/**
 * **试听把另一个实例按停，试听结束再把它接回去。**
 *
 * 详情弹窗正放着自己的 BGM 时点「编辑」→ 在选曲面板里试听另一首。两个实例各建
 * 各的媒体元素，仲裁必须让原来那一路闭嘴 —— 但**只能按停，不能停掉**：
 * `stop()` 走 `releaseElement()` 销毁对方的元素，对方从此回不来（重播要整只重建、
 * 从头开始），详情弹窗那行会一直显示「无背景音乐」，连开关一起消失。
 * 用户只是试听、没选那一首的话，条目数据一个字节都没动，界面不该跟着变。
 *
 * 反过来，「对方本来就是用户手动暂停的」必须原样留着：我们只是把它按住更久，
 * 无权替用户解停 —— 记错了，试听一结束就会擅自把用户按下的音乐放起来。
 */
describe("useGalleryBgm 试听期间的让位与恢复", () => {
  const AUDITION = { src: "https://cdn.example.test/music/audition.mp3", type: "audio" };
  const AUDITION_2 = { src: "https://cdn.example.test/music/audition-2.mp3", type: "audio" };

  /** 有状态的侧栏替身：`pause()` 必须真翻转 `paused`，否则模拟不出「已被按下去」 */
  function makePlayer() {
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
    return player;
  }

  // 本组用例自建的实例都登记在这里，收尾统一停掉：`soundingInstance` 是模块级的，
  // 留着上一轮的发声者会串进下一个用例。倒着停 —— 后起播的先停，
  // 收尾之后槽位是空的
  let mounted = [];

  const newBgm = () => {
    const created = [];
    const bgm = useGalleryBgm((tag) => {
      const el = fakeElement(tag);
      created.push(el);
      return el;
    });
    mounted.push(bgm);
    return { bgm, created };
  };

  /** 详情弹窗那一路在响，选择器这一路开始试听另一首 */
  const mountAudition = () => {
    const player = makePlayer();
    registerPlayerAudio(player);
    const dialog = newBgm();
    const picker = newBgm();
    dialog.bgm.play(PHOTO_WITH_BGM);
    picker.bgm.playSource(AUDITION, "site:a");
    return { dialog, picker, player };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    [...mounted].reverse().forEach((bgm) => bgm.stop());
    mounted = [];
  });

  it("试听把对方按停：元素、进度与播放状态都留着", () => {
    const { dialog } = mountAudition();

    expect(dialog.created[0].pause).toHaveBeenCalledTimes(1); // 真的不出声了
    expect(dialog.bgm.paused.value).toBe(true);
    // 不是 `stop()`：曲子还在它名下，元素也没交回音量层（交回去就等于销毁了）
    expect(dialog.bgm.activeBgm.value).not.toBe(null);
    expect(dialog.bgm.activeId.value).not.toBe(null);
    expect(unregisterMediaElement).not.toHaveBeenCalledWith(dialog.created[0]);
  });

  it("试听结束时对方从原处接着放", () => {
    const { dialog, picker } = mountAudition();
    expect(dialog.created[0].play).toHaveBeenCalledTimes(1); // 起播那一次

    picker.bgm.stop();

    expect(dialog.bgm.paused.value).toBe(false);
    expect(dialog.created[0].play).toHaveBeenCalledTimes(2);
    expect(dialog.bgm.activeBgm.value).not.toBe(null);
  });

  /**
   * 连着试听第二首是最常见的操作（听一首、停掉、再听下一首）。
   * 试听结束时对方被接回原处接着放，槽位也必须交回给它 —— 留在 `null` 上的话，
   * 下一次试听看不到「还有人在响」，就不再按停它，两路音频一起出声。
   */
  it("试听完一首再试听下一首，对方仍然被按停", () => {
    const { dialog, picker } = mountAudition();

    picker.bgm.stop(); // 第一次试听结束：详情弹窗那一首接着放
    expect(dialog.bgm.paused.value).toBe(false);

    picker.bgm.playSource(AUDITION_2, "site:b"); // 再试听另一首出来

    expect(dialog.bgm.paused.value).toBe(true);
    expect(dialog.created[0].pause).toHaveBeenCalledTimes(2);
    expect(dialog.created[0].play).toHaveBeenCalledTimes(2); // 起播一次、接回去一次
    expect(picker.created).toHaveLength(2);
    expect(picker.created[1].play).toHaveBeenCalledTimes(1);
  });

  /** 对方本来就是用户按停的：我们只是把它按住更久，无权替用户解停 */
  it("对方本来就被用户按停时，试听结束不擅自把它放起来", () => {
    const player = makePlayer();
    registerPlayerAudio(player);
    const dialog = newBgm();
    dialog.bgm.play(PHOTO_WITH_BGM);
    dialog.bgm.pause(); // 用户自己点的暂停
    expect(dialog.bgm.paused.value).toBe(true);

    const picker = newBgm();
    picker.bgm.playSource(AUDITION, "site:a");
    picker.bgm.stop();

    expect(dialog.bgm.paused.value).toBe(true);
    expect(dialog.created[0].play).toHaveBeenCalledTimes(1); // 只有起播那一次
    expect(dialog.bgm.activeBgm.value).not.toBe(null);
  });

  /**
   * `pause()` 返回「本次是否真的按下了」。
   *
   * 返回值不是装饰：仲裁要靠它区分「我按停的」与「用户本来就按停的」。
   * 后者不记，试听结束时才不会擅自解停用户按下的音乐。
   */
  it("pause 返回本次是否真的按下了", () => {
    const { bgm } = newBgm(); // 走同一套收尾：模块状态不留给下一个用例

    expect(bgm.pause()).toBe(false); // 还没有东西可停
    bgm.playSource(AUDITION, "site:a");
    expect(bgm.pause()).toBe(true); // 真的按下了
    expect(bgm.pause()).toBe(false); // 已经在暂停态：没有动它
  });
});

/**
 * 正在发声的元素要交得出去。
 *
 * 提示音响时要压低它，而这个元素是 createElement 建的、**从不进 DOM** ——
 * 页面上的选择器查不到，只能由这里交出来。交出去的必须是在响的那一个，
 * 且释放之后归 `null`：调用方不该碰到已经销毁的元素。
 */
describe("正在发声的元素", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("起播时交出当前元素，停止后收回", () => {
    const { bgm, created } = mountBgm();

    bgm.play(PHOTO_WITH_BGM);
    expect(getActiveBgmElement()).toBe(created[0]);

    bgm.stop();
    expect(getActiveBgmElement()).toBe(null);
  });

  /** 换项会销毁旧元素：槽位里留着它，调用方就会去写一个已经释放的元素 */
  it("换项时换上新元素，不留旧元素", () => {
    const { bgm, created } = mountBgm();
    bgm.play(PHOTO_WITH_BGM);
    bgm.play({ id: 9, type: "music", src: "https://cdn.example.test/music/z.mp3" });

    expect(getActiveBgmElement()).toBe(created[1]);

    bgm.stop();
    expect(getActiveBgmElement()).toBe(null);
  });

  /** 打开没有 BGM 的项等于停止，槽位要空掉 */
  it("打开没有 BGM 的项之后槽位为空", () => {
    const { bgm } = mountBgm();
    bgm.play(PHOTO_WITH_BGM);

    bgm.play(PLAIN_PHOTO);

    expect(getActiveBgmElement()).toBe(null);
  });

  /**
   * 暂停只停声音，元素与进度都还在。该不该压低由调用方按 `paused` 判断 ——
   * 这里不替它筛，否则调用方拿不到「暂停中的那一个」也就无法判断。
   */
  it("暂停（保留进度）时仍然交出元素", () => {
    const { bgm, created } = mountBgm();
    bgm.play(PHOTO_WITH_BGM);

    bgm.pause();
    expect(getActiveBgmElement()).toBe(created[0]);

    bgm.stop();
    expect(getActiveBgmElement()).toBe(null);
  });
});
