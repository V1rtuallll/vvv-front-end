import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App.vue";

/**
 * 全局音效与背景音乐音量的互动。
 *
 * 这里钉的是一条用户听得见的回归：响音效时会把背景音乐压低，音效结束后还原。
 * 还原的目标音量必须是**压低之前**记下的那一个 —— 一旦在某次响音效时重新去读
 * 当前音量，读到的可能已经是压低后的值，音乐就再也回不到原来的响度。
 */

/** 本次调用 play() 过的元素，按顺序 */
const played = [];

function mountApp() {
  return mount(App, { global: { stubs: { "router-view": true } } });
}

/** 造一个「正在播放、指定音量」的侧栏播放器 */
function mountMusicPlayer(volume) {
  const wrapper = document.createElement("div");
  wrapper.className = "music-player";
  const audio = document.createElement("audio");
  audio.volume = volume;
  // jsdom 里 paused 恒为 true，这里摆成「正在播」，压低逻辑才会生效
  Object.defineProperty(audio, "paused", { value: false, configurable: true });
  wrapper.appendChild(audio);
  document.body.appendChild(wrapper);
  return audio;
}

beforeEach(() => {
  played.length = 0;
  // jsdom 不实现 HTMLMediaElement 的 play / pause，两个都桩掉，
  // 否则 jsdom 会往输出里打 “Not implemented” 噪音
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(function () {
    played.push(this);
    return Promise.resolve();
  });
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  // 让音量动画一帧走完，断言才能看到最终音量（时长是 300/500ms）
  vi.stubGlobal("requestAnimationFrame", (cb) => {
    cb(performance.now() + 1000);
    return 1;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("全局音效与背景音乐音量", () => {
  /**
   * 连着来两条提示时，第二个音效会 pause() 打断第一个 —— 而 pause() **不会**
   * 触发第一个音效的 onended，那一刻音量还停在压低值上。
   * 若此时重新读「原音量」，就会把压低后的值记成原音量，
   * 音乐之后只恢复到那个值：用户听到的是背景音乐永久变轻，刷新页面才回来。
   */
  it("连着响两次音效之后，音乐仍能恢复到原来的音量", () => {
    const music = mountMusicPlayer(0.3);
    mountApp();

    window.playGlobalRandomSound();
    expect(music.volume).toBeCloseTo(0.1, 5);

    window.playGlobalRandomSound();
    expect(music.volume).toBeCloseTo(0.1, 5);

    played[played.length - 1].onended();

    expect(music.volume).toBeCloseTo(0.3, 5);
  });

  /** 音量取自音乐播放器当前值，不是写死的默认值 */
  it("恢复的是音乐自己的音量", () => {
    const music = mountMusicPlayer(0.75);
    mountApp();

    window.playGlobalRandomSound();
    expect(music.volume).toBeCloseTo(0.1, 5);

    played[played.length - 1].onended();

    expect(music.volume).toBeCloseTo(0.75, 5);
  });

  /** 页面上没有音乐播放器时（未挂载 / 其它路由）不该出错 */
  it("没有音乐播放器时不报错", () => {
    mountApp();

    expect(() => {
      window.playGlobalRandomSound();
      played[played.length - 1].onended();
    }).not.toThrow();
  });
});
