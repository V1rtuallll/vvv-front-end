import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/about/api/aboutApi", () => ({ getAbout: vi.fn() }));

import { getAbout } from "@/modules/about/api/aboutApi";
import { useAboutPage } from "@/modules/about/composables/useAboutPage";

const Host = { setup: () => useAboutPage(), template: "<div />" };

async function mountAbout() {
  const wrapper = mount(Host);
  await flushPromises();
  return wrapper.vm;
}

describe("useAboutPage", () => {
  beforeEach(() => {
    getAbout.mockResolvedValue({ data: { displayName: "V1rtual", links: null, tags: null } });
  });

  it("加载远端内容", async () => {
    const { content } = await mountAbout();

    expect(content.displayName).toBe("V1rtual");
  });

  it("后端返回 null 的列表退化成空数组，页面不用再判空", async () => {
    const { content } = await mountAbout();

    expect(content.links).toEqual([]);
    expect(content.tags).toEqual([]);
  });

  it("加载结束后 loading 归位", async () => {
    const { loading } = await mountAbout();

    expect(loading).toBe(false);
  });

  it("加载失败时退回空内容，且不重复弹提示", async () => {
    getAbout.mockRejectedValue(new Error("boom"));

    const { content } = await mountAbout();

    expect(content.displayName).toBe("");
    // 提示由 request.js 负责，这里再弹一次用户会看到两条
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });
});
