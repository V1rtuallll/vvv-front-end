import { flushPromises, mount } from "@vue/test-utils";
import { h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  pauseForBgm,
  registerPlayerAudio,
  resumeAfterBgm,
  useAudioPlayer,
} from "@/modules/player/composables/useAudioPlayer";

/** 够用的替身：被测代码只碰 paused / pause / play 三样 */
function fakePlayer(paused) {
  return { paused, pause: vi.fn(), play: vi.fn(() => Promise.resolve()) };
}

/**
 * 给 useAudioPlayer 一套最小的 DOM。8 个 ref 一个都不能少 —— composable 在
 * onMounted 里直接对它们取属性、挂监听。播放按钮里按真实结构放了一个 .ui-icon，
 * 被测的就是它的 class 切换。
 */
function mountPlayer() {
  let player;
  const wrapper = mount({
    setup() {
      player = useAudioPlayer();
      return () =>
        h("div", [
          h("audio", { ref: player.audioEl, preload: "auto" }),
          h("span", { ref: player.trackName }),
          h("progress", { ref: player.progressBar }),
          h("button", { ref: player.prevBtn, type: "button" }),
          h("button", { ref: player.playPauseBtn, type: "button", class: "play-pause" }, [
            h("span", { class: "ui-icon ui-icon-play" }),
          ]),
          h("button", { ref: player.nextBtn, type: "button", class: "next" }),
          h("input", { ref: player.volumeSlider, type: "range" }),
          h("div", { ref: player.volumeDisplay }),
        ]);
    },
  });
  return wrapper;
}

/** 把音频元素摆成「正在播」。jsdom 里 paused 恒为 true，不摆就永远走不到暂停那一支 */
function makePlaying(wrapper) {
  Object.defineProperty(wrapper.find("audio").element, "paused", {
    value: false,
    configurable: true,
  });
}

describe("侧栏播放器为详情 BGM 让位", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerPlayerAudio(null);
  });

  it("原本在播时会让位，并在详情关闭后恢复", () => {
    const player = fakePlayer(false);
    registerPlayerAudio(player);

    pauseForBgm();

    expect(player.pause).toHaveBeenCalledTimes(1);

    resumeAfterBgm();

    expect(player.play).toHaveBeenCalledTimes(1);
  });

  /**
   * 关掉详情就擅自开始放音乐，比「不恢复」更糟：用户压根没要求它放。
   */
  it("原本没在播时不做任何事", () => {
    const player = fakePlayer(true);
    registerPlayerAudio(player);

    pauseForBgm();
    resumeAfterBgm();

    expect(player.pause).not.toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
  });

  /** 连着关两次详情不该放两次 */
  it("恢复只发生一次", () => {
    const player = fakePlayer(false);
    registerPlayerAudio(player);

    pauseForBgm();
    resumeAfterBgm();
    resumeAfterBgm();

    expect(player.play).toHaveBeenCalledTimes(1);
  });

  /**
   * 让位期间被叫停多次是正常路径：Task 11 换项时会再调一次 `pauseForBgm`，
   * Task 13 的试听又是另一个实例。
   *
   * 第二次调用看到的「已暂停」**正是我们自己刚干的** —— 那时若把「原本在播」
   * 写成 false，关弹窗时侧栏就再也不响了：用户的歌静默消失，而页面不报错。
   *
   * 这里的替身要让 `pause()` 真的翻转 `paused`，否则模拟不出「被自己暂停过」
   * 这个状态，用例就会永远绿灯。
   */
  it("连着让位两次，关掉详情后仍然恢复", () => {
    const player = fakePlayer(false);
    player.pause = vi.fn(() => {
      player.paused = true;
    });
    registerPlayerAudio(player);

    pauseForBgm();
    pauseForBgm();

    expect(player.pause).toHaveBeenCalledTimes(1);

    resumeAfterBgm();

    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it("播放器还没挂载时两个函数都不抛异常", () => {
    expect(() => {
      pauseForBgm();
      resumeAfterBgm();
    }).not.toThrow();
  });

  /** 浏览器拒绝自动播放只意味着没声音，不该让关弹窗这一步出错 */
  it("play() 返回被拒的 Promise 时不抛异常", () => {
    const player = fakePlayer(false);
    player.play = vi.fn(() => Promise.reject(new Error("blocked")));
    registerPlayerAudio(player);

    pauseForBgm();

    expect(() => resumeAfterBgm()).not.toThrow();
  });

  /** jsdom 里 play() 返回 undefined；对 undefined 调 .catch 会 TypeError */
  it("play() 不返回 Promise 时也不抛异常", () => {
    const player = fakePlayer(false);
    player.play = vi.fn(() => undefined);
    registerPlayerAudio(player);

    pauseForBgm();

    expect(() => resumeAfterBgm()).not.toThrow();
  });
});

/**
 * 播放/暂停按钮显示的是矢量图标，不是 "▶" / "■" —— 这些几何字符在
 * iOS/Safari 上会被渲染成彩色 emoji。状态靠切 class 表达：暂停/空闲是
 * ui-icon-play，播放中是 ui-icon-pause。
 */
describe("播放器按钮图标", () => {
  beforeEach(() => {
    // jsdom 不实现 HTMLMediaElement 的 play / pause：play() 返回 undefined，
    // playSong 里的 .catch 会直接抛 TypeError，桩掉才走得到后面的图标切换
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(() =>
      Promise.resolve(),
    );
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  it("空闲时显示播放图标，点一下换成暂停图标", async () => {
    const wrapper = mountPlayer();
    await flushPromises();

    expect(wrapper.find(".play-pause .ui-icon").classes()).toContain("ui-icon-play");

    await wrapper.find(".play-pause").trigger("click");

    const classes = wrapper.find(".play-pause .ui-icon").classes();
    expect(classes).toContain("ui-icon-pause");
    expect(classes).not.toContain("ui-icon-play");
  });

  it("播放中再点一下回到播放图标", async () => {
    const wrapper = mountPlayer();
    await flushPromises();

    await wrapper.find(".play-pause").trigger("click");
    makePlaying(wrapper);

    await wrapper.find(".play-pause").trigger("click");

    const classes = wrapper.find(".play-pause .ui-icon").classes();
    expect(classes).toContain("ui-icon-play");
    expect(classes).not.toContain("ui-icon-pause");
  });

  it("按钮里不再有 ▶ / ■ 这类字符", async () => {
    const wrapper = mountPlayer();
    await flushPromises();

    expect(wrapper.find(".play-pause").text()).toBe("");
  });

  it("切歌会续播，图标跟前一首保持同一套状态", async () => {
    const wrapper = mountPlayer();
    await flushPromises();

    await wrapper.find(".play-pause").trigger("click");
    await wrapper.find(".next").trigger("click");

    expect(wrapper.find(".play-pause .ui-icon").classes()).toContain("ui-icon-pause");
  });
});
