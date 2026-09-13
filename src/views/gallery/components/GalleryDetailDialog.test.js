import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import GalleryDetailDialog from "@/views/gallery/components/GalleryDetailDialog.vue";

const ITEM = { id: 1, type: "photo", src: "/a.jpg", title: "标题", description: "描述" };

function mountDialog() {
  return mount(GalleryDetailDialog, {
    props: {
      item: ITEM,
      comments: [],
      comment: "",
      formatDate: () => "2026/9/12 10:00:00",
      formatShortDate: () => "2026/9/12",
    },
  });
}

function touchEvent(type, clientY) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", { value: [{ clientY }] });
  return event;
}

describe("GalleryDetailDialog 拖动调整高度", () => {
  it("鼠标按下时派发 resize-start，交给页面的拖拽逻辑处理", async () => {
    const wrapper = mountDialog();

    await wrapper.find(".resize-handle").trigger("mousedown");

    expect(wrapper.emitted("resize-start")).toHaveLength(1);
  });

  it("触摸拖动会改变描述区高度", async () => {
    const wrapper = mountDialog();
    const description = wrapper.find(".detail-desc").element;

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 100));
    document.dispatchEvent(touchEvent("touchmove", 300));

    expect(description.style.height).toBe("200px");
  });

  it("高度上限为视口高度的一半", async () => {
    const wrapper = mountDialog();
    const description = wrapper.find(".detail-desc").element;

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 0));
    document.dispatchEvent(touchEvent("touchmove", 5000));

    expect(description.style.height).toBe(`${window.innerHeight * 0.5}px`);
  });

  it("高度下限为 60px", async () => {
    const wrapper = mountDialog();
    const description = wrapper.find(".detail-desc").element;

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 100));
    document.dispatchEvent(touchEvent("touchmove", 10));

    expect(description.style.height).toBe("60px");
  });

  it("触摸结束后不再跟随移动", async () => {
    const wrapper = mountDialog();
    const description = wrapper.find(".detail-desc").element;

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 100));
    document.dispatchEvent(touchEvent("touchmove", 300));
    document.dispatchEvent(touchEvent("touchend", 300));
    document.dispatchEvent(touchEvent("touchmove", 800));

    expect(description.style.height).toBe("200px");
  });

  it("没有触摸点时忽略 touchstart", () => {
    const wrapper = mountDialog();
    const description = wrapper.find(".detail-desc").element;

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 100));
    wrapper.find(".resize-handle").element.dispatchEvent(new Event("touchstart"));
    document.dispatchEvent(touchEvent("touchmove", 300));

    expect(description.style.height).toBe("200px");
  });

  it("组件卸载时移除监听，避免遗留全局事件", () => {
    const wrapper = mountDialog();
    const removeSpy = vi.spyOn(document, "removeEventListener");

    wrapper.find(".resize-handle").element.dispatchEvent(touchEvent("touchstart", 100));
    wrapper.unmount();

    expect(removeSpy).toHaveBeenCalledWith("touchmove", expect.any(Function));
  });
});
