import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/about/api/aboutApi", () => ({ getAbout: vi.fn() }));
vi.mock("@/modules/admin/api/adminApi", () => ({ saveAdminAbout: vi.fn() }));

import { saveAdminAbout } from "@/modules/admin/api/adminApi";
import { getAbout } from "@/modules/about/api/aboutApi";
import { useAboutConfig } from "@/modules/about/composables/useAboutConfig";

const Host = { setup: () => useAboutConfig(), template: "<div />" };

async function mountConfig() {
  const wrapper = mount(Host);
  await flushPromises();
  return wrapper.vm;
}

describe("useAboutConfig", () => {
  beforeEach(() => {
    getAbout.mockResolvedValue({ data: { displayName: "V1rtual", links: null, tags: null } });
    saveAdminAbout.mockResolvedValue({ code: 200 });
  });

  it("从公开接口读回已有内容", async () => {
    const { content } = await mountConfig();

    expect(content.displayName).toBe("V1rtual");
    expect(content.links).toEqual([]);
    expect(content.tags).toEqual([]);
  });

  it("保存后提示成功并重新读取", async () => {
    const { save } = await mountConfig();
    getAbout.mockClear();

    await save({ displayName: "新的" });

    expect(saveAdminAbout).toHaveBeenCalledWith({ displayName: "新的" });
    expect(window.$vmessage.success).toHaveBeenCalledWith("About 配置已保存");
    expect(getAbout).toHaveBeenCalledTimes(1);
  });

  it("保存失败不重复弹提示", async () => {
    saveAdminAbout.mockRejectedValue(new Error("boom"));
    const { save } = await mountConfig();
    window.$vmessage.success.mockClear();

    await save({ displayName: "新的" });

    // 提示由 request.js 负责
    expect(window.$vmessage.success).not.toHaveBeenCalled();
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  it("保存过程中 saving 为 true，结束后归位", async () => {
    let resolve;
    saveAdminAbout.mockReturnValue(new Promise((r) => { resolve = r; }));
    const vm = await mountConfig();

    // saving 每次都要从组件实例上现取：解构出来的是取的那一刻的值，不是代理本身
    const pending = vm.save({ displayName: "新的" });
    expect(vm.saving).toBe(true);

    resolve({ code: 200 });
    await pending;

    expect(vm.saving).toBe(false);
  });
});
