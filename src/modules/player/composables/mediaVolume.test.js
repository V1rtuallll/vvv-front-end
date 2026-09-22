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
  });

  it("keeps the duck factor App has always used", () => {
    // 这个字面值以前被 App.test.js 写死在好几条断言里，全局音量之后那些断言
    // 改成了「全局音量 × DUCK_FACTOR」，数值就集中钉在这一条上
    expect(DUCK_FACTOR).toBe(0.1);
  });
});
