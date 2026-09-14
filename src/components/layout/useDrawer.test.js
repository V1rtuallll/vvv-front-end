import { mount } from "@vue/test-utils";
import { h, nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import { useDrawer } from "@/components/layout/useDrawer";

// useDrawer 依赖 onBeforeUnmount，必须在组件上下文里调用
function mountDrawer() {
  let drawer;
  const wrapper = mount({
    setup() {
      drawer = useDrawer();
      return () => h("div");
    },
  });
  return { wrapper, drawer };
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("useDrawer 开合状态", () => {
  it("初始为收起，且不锁 body 滚动", () => {
    const { drawer } = mountDrawer();

    expect(drawer.openDrawer.value).toBe(null);
    expect(document.body.style.overflow).toBe("");
  });

  it("打开后记录当前抽屉名", () => {
    const { drawer } = mountDrawer();

    drawer.toggleDrawer("nav");

    expect(drawer.openDrawer.value).toBe("nav");
  });

  it("再次点击同一个按钮收起", () => {
    const { drawer } = mountDrawer();

    drawer.toggleDrawer("nav");
    drawer.toggleDrawer("nav");

    expect(drawer.openDrawer.value).toBe(null);
  });

  it("打开另一个时前一个自动关闭", () => {
    const { drawer } = mountDrawer();

    drawer.toggleDrawer("nav");
    drawer.toggleDrawer("player");

    expect(drawer.openDrawer.value).toBe("player");
  });

  it("打开时锁定 body 滚动，收起时还原", async () => {
    const { drawer } = mountDrawer();

    drawer.toggleDrawer("nav");
    await nextTick();
    expect(document.body.style.overflow).toBe("hidden");

    drawer.closeDrawer();
    await nextTick();
    expect(document.body.style.overflow).toBe("");
  });
});
