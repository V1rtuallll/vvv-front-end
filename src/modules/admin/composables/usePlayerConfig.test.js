import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/api/adminApi", () => ({ savePlayerConfig: vi.fn() }));
vi.mock("@/modules/player/api/playerApi", () => ({ getPlayerPlaylist: vi.fn() }));
vi.mock("@/modules/player/playlist", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, buildTimeTracks: ["a.mp3", "b.mp3"] };
});

import { savePlayerConfig } from "@/modules/admin/api/adminApi";
import { usePlayerConfig } from "@/modules/admin/composables/usePlayerConfig";
import { getPlayerPlaylist } from "@/modules/player/api/playerApi";

const Host = { setup: () => usePlayerConfig(), template: "<div />" };

async function mountConfig() {
  const wrapper = mount(Host);
  await flushPromises();
  return wrapper.vm;
}

describe("usePlayerConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPlayerPlaylist.mockResolvedValue({ data: ["a.mp3"] });
    savePlayerConfig.mockResolvedValue({ code: 200 });
  });

  it("候选名单来自构建期清单", async () => {
    const { candidates } = await mountConfig();

    expect(candidates).toEqual(["a.mp3", "b.mp3"]);
  });

  it("读回库里已保存的选择", async () => {
    const { selected, loaded } = await mountConfig();

    expect(selected).toEqual(["a.mp3"]);
    expect(loaded).toBe(true);
  });

  /**
   * 加载失败时 selected 是空的，此时保存会把库里已有的配置清空。
   * 用 loaded 挡住，与 useAboutConfig 同一套防法。
   */
  it("加载失败时不置 loaded，也不覆盖库里的内容", async () => {
    getPlayerPlaylist.mockRejectedValue(new Error("boom"));
    const vm = await mountConfig();

    expect(vm.loaded).toBe(false);

    await vm.save(["a.mp3"]);

    expect(savePlayerConfig).not.toHaveBeenCalled();
  });

  it("保存后提示成功并重新读取", async () => {
    const vm = await mountConfig();
    getPlayerPlaylist.mockClear();

    await vm.save(["b.mp3"]);

    expect(savePlayerConfig).toHaveBeenCalledWith(["b.mp3"]);
    expect(window.$vmessage.success).toHaveBeenCalledWith("播放器曲目已保存");
    expect(getPlayerPlaylist).toHaveBeenCalledTimes(1);
  });

  it("保存失败时不弹第二条提示", async () => {
    savePlayerConfig.mockRejectedValue(new Error("boom"));
    const vm = await mountConfig();

    await vm.save(["b.mp3"]);

    // 提示由 request.js 负责
    expect(window.$vmessage.success).not.toHaveBeenCalled();
  });

  it("保存过程中 saving 为 true，结束后归位", async () => {
    let resolve;
    savePlayerConfig.mockReturnValue(new Promise((r) => { resolve = r; }));
    const vm = await mountConfig();

    // saving 每次都要从组件实例上现取：解构出来的是取的那一刻的值
    const pending = vm.save(["a.mp3"]);
    expect(vm.saving).toBe(true);

    resolve({ code: 200 });
    await pending;

    expect(vm.saving).toBe(false);
  });

  it("配置里指向已删文件的条目单独列出来", async () => {
    getPlayerPlaylist.mockResolvedValue({ data: ["a.mp3", "gone.mp3"] });
    const { staleNames } = await mountConfig();

    expect(staleNames).toEqual(["gone.mp3"]);
  });
});
