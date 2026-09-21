import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App.vue";
import { useGalleryBgm } from "@/modules/gallery/composables/useGalleryBgm";

/**
 * 全局音效与背景音乐音量的互动。
 *
 * 这里钉的是一条用户听得见的回归：响音效时会把**正在响的**音源压低，音效结束后
 * 还原。音源有两路 —— 侧栏播放器与画廊详情弹窗的 BGM —— 各自的音量互相独立。
 * 还原的目标音量必须是**压低之前**记下的那一个：一旦在某次响音效时重新去读
 * 当前音量，读到的可能已经是压低后的值，音乐就再也回不到原来的响度。
 */

/** 本次调用 play() 过的元素，按顺序 */
const played = [];

/**
 * 元素 → 它被 play() 那一刻的 muted 值。解锁是否静音就看它。
 *
 * 用 Map 而不是数组：同一个文件里前面的用例也挂过 App，它们的解锁监听
 * 只在首次交互时才移除，本次点击会把它们一起触发。按元素查才只看到
 * 本次挂载的九个。
 */
const mutedAtPlay = new Map();

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

/** 本次文件里造过的 BGM 实例，收尾时统一停掉 —— 元素槽位是模块级的，会跨用例留下 */
const bgmInstances = [];

/**
 * 造一路「指定音量」的画廊 BGM。
 *
 * BGM 的元素是 useGalleryBgm 用 createElement 建的、**从不进 DOM**，
 * 页面上的 `.music-player audio` 查不到它，只能从这个工厂喂进去。
 * `playing` 为 false 摆出「用户按了暂停」。
 */
function mountGalleryBgm(volume, { playing = true } = {}) {
  const element = {
    loop: false,
    src: "",
    volume,
    paused: !playing,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
  };
  const bgm = useGalleryBgm(() => element);
  bgm.playSource({ src: "https://cdn.example.test/music/bgm.mp3", type: "audio" });
  bgmInstances.push(bgm);
  return element;
}

/**
 * 手动推进音量动画。
 *
 * 默认的 rAF 替身让动画一帧走完，摆不出「还原还停在半路上」的那一刻；
 * 这里把帧回调攒起来由用例推进，`cancelAnimationFrame` 也照实实现 ——
 * 被取消的那一帧不许再跑。
 */
function manualAnimationFrames() {
  const pending = new Map();
  let nextHandle = 0;
  vi.stubGlobal("requestAnimationFrame", (cb) => {
    pending.set(++nextHandle, cb);
    return nextHandle;
  });
  vi.stubGlobal("cancelAnimationFrame", (handle) => pending.delete(handle));
  return {
    /** 用一个时间点推进所有待跑的帧，返回推进之后还剩几帧 */
    step(offsetMs) {
      const frames = [...pending.values()];
      pending.clear();
      frames.forEach((cb) => cb(performance.now() + offsetMs));
      return pending.size;
    },
  };
}

beforeEach(() => {
  played.length = 0;
  mutedAtPlay.clear();
  // jsdom 不实现 HTMLMediaElement 的 play / pause，两个都桩掉，
  // 否则 jsdom 会往输出里打 “Not implemented” 噪音
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(function () {
    played.push(this);
    mutedAtPlay.set(this, this.muted);
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
  // 释放 BGM 的元素槽位：它是模块级的，留着会让下一条用例多出一路音源
  bgmInstances.forEach((bgm) => bgm.stop());
  bgmInstances.length = 0;
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

/**
 * 画廊详情弹窗的 BGM 也是「正在响的音源」。
 *
 * 它的元素由 useGalleryBgm 用 createElement 建、从不进 DOM，侧栏那套
 * `document.querySelector(".music-player audio")` 根本看不到它 ——
 * 少了这一路，弹窗开着时响提示音，BGM 一点都不会让路。
 */
describe("画廊 BGM 与侧栏一起让路", () => {
  it("两路音源同时响时都被压低", () => {
    const music = mountMusicPlayer(0.3);
    const bgmElement = mountGalleryBgm(1);
    mountApp();

    window.playGlobalRandomSound();

    expect(music.volume).toBeCloseTo(0.1, 5);
    expect(bgmElement.volume).toBeCloseTo(0.1, 5);
  });

  /** 音量各记各的：压低一共用一个槽位的话，两路会互相用对方的原音量还原 */
  it("两路各自还原成压低前的音量", () => {
    const music = mountMusicPlayer(0.75);
    const bgmElement = mountGalleryBgm(0.6);
    mountApp();

    window.playGlobalRandomSound();
    played[played.length - 1].onended();

    expect(music.volume).toBeCloseTo(0.75, 5);
    expect(bgmElement.volume).toBeCloseTo(0.6, 5);
  });

  /** 压低只针对正在响的音源：暂停中的元素连音量都不该被写 */
  it("暂停中的画廊 BGM 不被压低，也不留下压低前的记录", () => {
    const music = mountMusicPlayer(0.3);
    const bgmElement = mountGalleryBgm(0.8, { playing: false });
    mountApp();

    window.playGlobalRandomSound();
    expect(bgmElement.volume).toBe(0.8);
    expect(music.volume).toBeCloseTo(0.1, 5);

    // 音效结束前它开始播了，此刻的音量与被跳过的 0.8 无关：
    // 若那个值被记下来，这次还原会把它写回去
    bgmElement.paused = false;
    bgmElement.volume = 0.2;
    played[played.length - 1].onended();

    expect(bgmElement.volume).toBe(0.2);
    expect(music.volume).toBeCloseTo(0.3, 5);
  });

  /** 与侧栏同一条回归：连着两条提示不能把 BGM 越压越轻 */
  it("连着两条音效，BGM 也只压低一次、还原一次", () => {
    const bgmElement = mountGalleryBgm(1);
    mountApp();

    window.playGlobalRandomSound();
    expect(bgmElement.volume).toBeCloseTo(0.1, 5);

    window.playGlobalRandomSound();
    expect(bgmElement.volume).toBeCloseTo(0.1, 5);

    played[played.length - 1].onended();

    expect(bgmElement.volume).toBeCloseTo(1, 5);
  });

  /**
   * 还原的**半路上**又来一个音效。
   *
   * 还原动画要 500ms 才走完，这期间音量既不是压低值也不是原值（这里是 0.275）。
   * 若还原一开始就作废记录、新音效重新读一次当前音量，音乐每响一次就轻一点 ——
   * 与开头那条同属一类：**正在变化中的音量不能当「原音量」用**。
   */
  it("还原还没走完时再响音效，音乐不会被算轻", () => {
    const music = mountMusicPlayer(0.3);
    const frames = manualAnimationFrames();
    mountApp();

    window.playGlobalRandomSound();
    frames.step(1000); // 压低动画走完
    expect(music.volume).toBeCloseTo(0.1, 5);

    played[played.length - 1].onended(); // 音效结束，还原开始
    frames.step(250); // 还原走到一半
    expect(music.volume).toBeGreaterThan(0.1);
    expect(music.volume).toBeLessThan(0.3);

    window.playGlobalRandomSound(); // 半路上又来一个音效
    frames.step(1000);
    expect(music.volume).toBeCloseTo(0.1, 5);
    // 被取消的那轮还原不该在之后的帧里把音量又抬回去
    expect(frames.step(1000)).toBe(0);

    played[played.length - 1].onended();
    frames.step(1000); // 第二次还原走完

    expect(music.volume).toBeCloseTo(0.3, 5);
  });
});

/**
 * 首次点击 / 触摸 / 按键时解锁音效的自动播放。
 *
 * 这些元素是 `preload="none"`，play() 会先真的出声、再等 Promise 回调里的
 * pause() 才停。不静音的话，用户听到的是一小段**与 vmessage 提示音完全相同**
 * 的音效，却没有任何提示框 —— 报「有提示音但没有提示」。
 */
describe("首次交互的静音解锁", () => {
  it("九个音效全程静音，解锁结束后都能正常出声", async () => {
    const wrapper = mountApp();
    const sounds = wrapper.findAll("audio").map((audio) => audio.element);
    expect(sounds).toHaveLength(9);

    document.dispatchEvent(new Event("click"));
    await flushPromises();

    // play() 那一刻必须已经静音，声音才发不出来
    expect(sounds.map((audio) => mutedAtPlay.get(audio))).toEqual(new Array(9).fill(true));
    // 静音只是解锁时的手段：结束后必须全部还原，否则之后的音效全哑
    expect(sounds.map((audio) => audio.muted)).toEqual(new Array(9).fill(false));
  });

  /** 解锁的意义就是「之后能带声播放」，不能因为静音把它弄丢 */
  it("解锁之后再响音效是有声的", async () => {
    mountApp();

    document.dispatchEvent(new Event("click"));
    await flushPromises();

    window.playGlobalRandomSound();

    expect(played[played.length - 1].muted).toBe(false);
  });

  /** 解锁失败（自动播放被拒）不该留下静音元素，下一次提示音就成了无声的 */
  it("play() 被拒时也不留下静音元素", async () => {
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(() =>
      Promise.reject(new Error("blocked")),
    );
    const wrapper = mountApp();

    document.dispatchEvent(new Event("click"));
    await flushPromises();

    expect(wrapper.findAll("audio").every((audio) => audio.element.muted === false)).toBe(true);
  });
});
