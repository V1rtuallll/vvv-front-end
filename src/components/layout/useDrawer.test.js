import { mount } from "@vue/test-utils";
import { h, nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import { useDrawer } from "@/components/layout/useDrawer";

function setViewportWidth(width) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

function pressEscape() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
}

function fireResize() {
  window.dispatchEvent(new Event("resize"));
}

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

describe("useDrawer 关闭触发", () => {
  it("按 Esc 收起", async () => {
    const { drawer } = mountDrawer();
    drawer.toggleDrawer("player");
    await nextTick();

    pressEscape();

    expect(drawer.openDrawer.value).toBe(null);
  });

  it("视口回到宽屏时收起", async () => {
    const { drawer } = mountDrawer();
    setViewportWidth(400);
    drawer.toggleDrawer("nav");
    await nextTick();

    setViewportWidth(1024);
    fireResize();

    expect(drawer.openDrawer.value).toBe(null);
  });

  it("仍在窄屏时 resize 不收起", async () => {
    const { drawer } = mountDrawer();
    setViewportWidth(400);
    drawer.toggleDrawer("nav");
    await nextTick();

    setViewportWidth(360);
    fireResize();

    expect(drawer.openDrawer.value).toBe("nav");
  });
});

describe("useDrawer 卸载清理", () => {
  it("卸载后不再响应 Esc", async () => {
    const { wrapper, drawer } = mountDrawer();
    drawer.toggleDrawer("nav");
    await nextTick();

    wrapper.unmount();
    pressEscape();

    expect(drawer.openDrawer.value).toBe("nav");
  });

  it("卸载后不再响应 resize", async () => {
    const { wrapper, drawer } = mountDrawer();
    setViewportWidth(400);
    drawer.toggleDrawer("nav");
    await nextTick();

    wrapper.unmount();
    setViewportWidth(1024);
    fireResize();

    expect(drawer.openDrawer.value).toBe("nav");
  });

  it("卸载后还原 body 滚动锁", async () => {
    const { wrapper, drawer } = mountDrawer();
    drawer.toggleDrawer("nav");
    await nextTick();
    expect(document.body.style.overflow).toBe("hidden");

    wrapper.unmount();

    expect(document.body.style.overflow).toBe("");
  });
});
