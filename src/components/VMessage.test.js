import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

import VMessage from "@/components/VMessage.vue";

/**
 * 全局把手（window.$vmessage）必须一直指向**活着的**那个实例。
 *
 * `showMessage` 里的音效是普通全局函数、与实例无关：把手指向一个已经卸载的
 * 实例时，音效照响，消息却推进了那个实例的数组 —— 屏幕上什么都不出现，
 * 用户看到的就是「只有声音没有弹窗」。
 *
 * setup.js 每次用例前装的替身在这里会被真实实现覆盖掉，这正是被测行为的一部分。
 */

describe("window.$vmessage 的装卸", () => {
  it("挂载后把手是真实实现，不再是测试替身", () => {
    const wrapper = mount(VMessage);

    expect(typeof window.$vmessage.success).toBe("function");
    expect(typeof window.$vmessage.info).toBe("function");
    expect(typeof window.$vmessage.warning).toBe("function");
    expect(typeof window.$vmessage.error).toBe("function");

    wrapper.unmount();
  });

  /** HMR 重建或任何一次重新挂载：新提示必须进新实例的 DOM */
  it("重新挂载后，提示渲染在新实例上", async () => {
    const first = mount(VMessage);
    const second = mount(VMessage);

    window.$vmessage.warning("重挂载后的提示");
    await nextTick();

    expect(second.text()).toContain("重挂载后的提示");
    expect(first.text()).not.toContain("重挂载后的提示");

    first.unmount();
    second.unmount();
  });

  /** 新的先挂载、旧的再卸载：清把手这一步不能把新实例刚装好的把手抹掉 */
  it("旧实例卸载不会抹掉新实例的把手", async () => {
    const first = mount(VMessage);
    const second = mount(VMessage);

    first.unmount();

    expect(window.$vmessage).not.toBe(null);
    window.$vmessage.info("仍然可见");
    await nextTick();
    expect(second.text()).toContain("仍然可见");

    second.unmount();
  });

  /** 卸载后归 null：调用方会退回 console，而不是调用一个已经死掉的实例 */
  it("卸载后把手归 null", () => {
    const wrapper = mount(VMessage);

    wrapper.unmount();

    expect(window.$vmessage).toBe(null);
  });
});
