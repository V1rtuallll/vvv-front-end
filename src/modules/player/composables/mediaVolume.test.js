import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { usePlayerStore } from "@/stores/player";
import {
  DUCK_FACTOR,
  applyVolume,
  clearDucked,
  getVolume,
  markDucked,
  registerMediaElement,
  setVolume,
  unregisterMediaElement,
} from "@/modules/player/composables/mediaVolume";

const fakeElement = () => ({ volume: 1, paused: false });

describe("mediaVolume", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("applies the stored volume the moment an element registers", () => {
    // 元素登记的那一刻就要按当前音量写一次：等下一次拖动滑块才生效的话，
    // 刷新页面后新挂上的媒体会以浏览器默认音量（1.0）出声
    usePlayerStore().volume = 0.4;
    const el = fakeElement();

    registerMediaElement(el);

    expect(el.volume).toBe(0.4);
  });

  it("pushes a new volume to every registered element", () => {
    const a = fakeElement();
    const b = fakeElement();
    registerMediaElement(a);
    registerMediaElement(b);

    setVolume(0.8);

    expect(a.volume).toBe(0.8);
    expect(b.volume).toBe(0.8);
    expect(getVolume()).toBe(0.8);
  });

  it("clamps out-of-range values instead of writing them", () => {
    const el = fakeElement();
    registerMediaElement(el);

    setVolume(3);
    expect(el.volume).toBe(1);

    setVolume(-1);
    expect(el.volume).toBe(0);
  });

  it("keeps a ducked element quiet when the volume changes mid-duck", () => {
    // 提示音压低期间用户拖动滑块：写回满音量会把压低打断，
    // 那句提示音就盖不住音乐了
    const el = fakeElement();
    registerMediaElement(el);
    markDucked(el);

    setVolume(0.5);

    expect(el.volume).toBeCloseTo(0.5 * DUCK_FACTOR);
  });

  it("restores the live volume rather than a snapshot taken before the duck", () => {
    const el = fakeElement();
    registerMediaElement(el);

    markDucked(el);
    setVolume(0.9);
    clearDucked(el);
    applyVolume(el);

    // 若还原的是「压低之前记下的那个值」，这里会回到旧音量，
    // 滑块显示的与实际出声的从此永久对不上
    expect(el.volume).toBe(0.9);
  });

  it("ignores null elements so callers do not have to guard", () => {
    expect(() => registerMediaElement(null)).not.toThrow();
    expect(() => applyVolume(null)).not.toThrow();
    expect(() => unregisterMediaElement(null)).not.toThrow();
  });

  /**
   * 登记表持有的是 DOM 元素本身。随组件卸载或起播结束销毁的元素（详情弹窗的
   * 视频、画廊 BGM 那个从不进 DOM 的元素）注销之后必须真的被放开 ——
   * 留在表里的话，滑块每动一次就去写一个已经销毁的元素，而且它永远不会被回收。
   */
  it("unregistered elements stop following the volume", () => {
    usePlayerStore().volume = 0.4;
    const el = fakeElement();
    registerMediaElement(el);

    unregisterMediaElement(el);
    setVolume(0.9);

    expect(el.volume).toBe(0.4);
  });

  /**
   * 压低名单是同一批元素的另一处引用。注销意味着「这个元素不再归音量层管」，
   * 那份压低记录也就此作废 —— 留着它，等于替一个已经销毁的元素继续记着状态。
   *
   * 可观察到的差别：重新登记同一个元素时，它不该继承那个早已结束的压低。
   */
  it("unregistering also drops the element from the ducked set", () => {
    usePlayerStore().volume = 0.5;
    const el = fakeElement();
    registerMediaElement(el);
    markDucked(el);

    unregisterMediaElement(el);
    registerMediaElement(el);

    // 留着旧的压低记录的话，这里会写 0.05：一个早已销毁的元素留下的状态
    // 被下一个登记它的元素继承
    expect(el.volume).toBe(0.5);
  });

  it("keeps the duck factor App has always used", () => {
    // 这个字面值以前被 App.test.js 写死在好几条断言里，全局音量之后那些断言
    // 改成了「全局音量 × DUCK_FACTOR」，数值就集中钉在这一条上
    expect(DUCK_FACTOR).toBe(0.1);
  });
});
