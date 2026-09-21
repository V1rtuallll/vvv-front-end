import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({ user: { username: "V1rtual" } }) }));
vi.mock("@/modules/admin/api/adminApi", () => ({
  getAdminHomeConfig: vi.fn(),
  getAdminResources: vi.fn(),
  saveAdminHomeConfig: vi.fn(),
  syncOssResources: vi.fn(),
  updateAdminResource: vi.fn(),
  uploadAdminResource: vi.fn(),
}));

import { getAdminHomeConfig, getAdminResources, saveAdminHomeConfig } from "@/modules/admin/api/adminApi";
import { useAdminPage } from "@/modules/admin/composables/useAdminPage";

const Host = { setup: () => useAdminPage(), template: "<div />" };

const CONFIG = {
  main: { type: "video", src: "https://example.test/hero.mp4", title: "标题", desc: "描述", alt: "", random: 0 },
  galleryItems: [{ type: "image", src: "https://example.test/a.png" }],
  availableFilesByType: { video: [], gif: [], image: [] },
  availableFiles: [],
};

async function mountPage() {
  const wrapper = mount(Host);
  await flushPromises();
  return wrapper.vm;
}

describe("useAdminPage 的 Home 配置", () => {
  beforeEach(() => {
    getAdminHomeConfig.mockResolvedValue({ data: { ...CONFIG } });
    getAdminResources.mockResolvedValue({ data: { list: [], total: 0 } });
    saveAdminHomeConfig.mockResolvedValue({ code: 200 });
  });

  it("读取成功后整体回填，保存时再把这份状态发回后端", async () => {
    const vm = await mountPage();

    await vm.saveHomeConfig();

    expect(saveAdminHomeConfig).toHaveBeenCalledTimes(1);
    const payload = saveAdminHomeConfig.mock.calls[0][0];
    expect(payload.main).toMatchObject({ type: "video", src: "https://example.test/hero.mp4", random: 0 });
    expect(payload.galleryItems).toEqual(CONFIG.galleryItems);
    expect(window.$vmessage.success).toHaveBeenCalledWith("Home 配置已保存");
  });

  it("读取失败时用默认状态，默认状态与回传的 payload 都不含已下线的 pinnedBlogId", async () => {
    getAdminHomeConfig.mockRejectedValue(new Error("boom"));
    const vm = await mountPage();

    expect("pinnedBlogId" in vm.homeConfig).toBe(false);

    await vm.saveHomeConfig();

    // 状态会被整体展开回传，默认状态里留一个后端不认识的键，保存时就会把它一起发过去
    expect("pinnedBlogId" in saveAdminHomeConfig.mock.calls[0][0]).toBe(false);
  });

  it("读取失败时默认状态用契约键 galleryItems，而不是 gallery", async () => {
    getAdminHomeConfig.mockRejectedValue(new Error("boom"));
    const vm = await mountPage();

    expect(vm.homeConfig.galleryItems).toEqual([]);
    expect("gallery" in vm.homeConfig).toBe(false);
  });

  it("从默认状态保存时回传的 galleryItems 是空数组，后端不会把它写成字面量 null", async () => {
    getAdminHomeConfig.mockRejectedValue(new Error("boom"));
    const vm = await mountPage();

    await vm.saveHomeConfig();

    // 后端保存时对 galleryItems 做 writeValueAsString：键缺失或值为 null 都会写出字面量 "null"，
    // 再存进 gallery_json，首页就解析不出配置条目。默认状态必须把数组原样回传。
    const payload = saveAdminHomeConfig.mock.calls[0][0];
    expect(payload.galleryItems).toEqual([]);
    expect("gallery" in payload).toBe(false);
  });
});
