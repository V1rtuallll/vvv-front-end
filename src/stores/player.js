import { defineStore } from "pinia";

/**
 * 全站唯一的音量。
 *
 * 它以前是侧栏播放器内部的一个变量（`audio.volume = 0.3`），因为那时只有一路声音。
 * 现在画廊的视频、画廊的 BGM、首页主展示的视频都要用同一个音量，再各自存一份
 * 就会出现「拖动滑块只有侧栏变轻、画廊照旧」这种要逐个排查的现象。
 *
 * 持久化交给 pinia 持久化插件（`main.js` 已经装了 pinia-plugin-persistedstate），
 * 不手写 localStorage —— 写两份的结果是它们迟早对不上。
 */
export const usePlayerStore = defineStore("player", {
  state: () => ({
    /** 0..1。0.3 沿用侧栏播放器原先的硬编码初值，不趁机改默认行为 */
    volume: 0.3,
  }),
  persist: true,
});
