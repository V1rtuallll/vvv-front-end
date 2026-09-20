import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  pauseForBgm,
  registerPlayerAudio,
  resumeAfterBgm,
} from "@/modules/player/composables/useAudioPlayer";

/** 够用的替身：被测代码只碰 paused / pause / play 三样 */
function fakePlayer(paused) {
  return { paused, pause: vi.fn(), play: vi.fn(() => Promise.resolve()) };
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
