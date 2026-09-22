import { beforeEach, describe, expect, it } from "vitest";
import { createApp, nextTick } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

import { usePlayerStore } from "@/stores/player";

/**
 * 装一个与生产同一套的 pinia：`main.js` 也是先建 app、装插件、再 `app.use(pinia)`。
 *
 * 中间那个 app 不能省。pinia 的 `use(plugin)` 在还没有 app 时只是把插件记进
 * 「待安装」名单，直到 `app.use(pinia)` 才真正启用 —— 少了这一步，`persist: true`
 * 会静默失效（store 上没有 `$persist`），那条「刷新还记得」的用例就会红得莫名其妙。
 */
function installFreshPinia() {
  const app = createApp({});
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);
  app.use(pinia); // 顺带把 activePinia 指到这个实例上
  return pinia;
}

describe("player store", () => {
  beforeEach(() => {
    installFreshPinia();
    localStorage.clear();
  });

  it("starts at the volume the sidebar has always used", () => {
    // 0.3 是侧栏播放器原先硬编码的值。改动不该顺手把默认音量也改了
    expect(usePlayerStore().volume).toBe(0.3);
  });

  it("persists the volume so a reload does not reset it", async () => {
    const store = usePlayerStore();
    store.volume = 0.75;
    // 落盘由插件在 $subscribe 里做（flush: 'pre'），要等一拍才写完
    await nextTick();

    // 新开一个 pinia 模拟刷新：值应当从 localStorage 恢复
    installFreshPinia();
    expect(usePlayerStore().volume).toBe(0.75);
  });
});
