import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/api/adminApi", () => ({ savePlayerConfig: vi.fn() }));
vi.mock("@/modules/player/api/playerApi", () => ({ getPlayerPlaylist: vi.fn() }));
vi.mock("@/modules/player/playlist", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, buildTimeTracks: ["Iwakura - farlands.mp3", "a_b.mp3"] };
});

import { savePlayerConfig } from "@/modules/admin/api/adminApi";
import { getPlayerPlaylist } from "@/modules/player/api/playerApi";
import PlayerConfigForm from "@/views/admin/components/PlayerConfigForm.vue";

async function mountForm(selected = []) {
  getPlayerPlaylist.mockResolvedValue({ data: selected });
  const wrapper = mount(PlayerConfigForm);
  await flushPromises();
  return wrapper;
}

const boxes = (wrapper) => wrapper.findAll(".track-check");
const names = (wrapper) => wrapper.findAll(".track-name").map((node) => node.text());

describe("PlayerConfigForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePlayerConfig.mockResolvedValue({ code: 200 });
  });

  it("候选名单来自构建期清单，名字用共享的格式化", async () => {
    const wrapper = await mountForm();

    expect(boxes(wrapper)).toHaveLength(2);
    expect(names(wrapper)).toEqual(["farlands", "a b"]);
  });

  it("库里已选的条目是勾上的", async () => {
    const wrapper = await mountForm(["a_b.mp3"]);

    expect(boxes(wrapper)[0].element.checked).toBe(false);
    expect(boxes(wrapper)[1].element.checked).toBe(true);
  });

  it("保存发出勾上的文件名，顺序按目录排", async () => {
    const wrapper = await mountForm();

    await boxes(wrapper)[1].setValue(true);
    await boxes(wrapper)[0].setValue(true);
    await wrapper.find(".crt-btn").trigger("click");

    expect(savePlayerConfig).toHaveBeenCalledWith(["Iwakura - farlands.mp3", "a_b.mp3"]);
  });

  it("全选勾上全部候选，全不选清空", async () => {
    const wrapper = await mountForm();

    await wrapper.find(".track-check-all").trigger("click");
    expect(boxes(wrapper).every((box) => box.element.checked)).toBe(true);

    await wrapper.find(".track-clear-all").trigger("click");
    expect(boxes(wrapper).some((box) => box.element.checked)).toBe(false);
  });

  /**
   * 配置里指向已删文件的条目：不勾上（保存时自然清掉），
   * 但要告诉作者一声，否则「配置里有、界面里没有」会看着像丢了数据。
   */
  it("失效条目单独提示且不勾选", async () => {
    const wrapper = await mountForm(["gone.mp3", "a_b.mp3"]);

    expect(names(wrapper)).not.toContain("gone");
    expect(wrapper.find(".stale-hint").text()).toContain("gone.mp3");
    expect(boxes(wrapper)[1].element.checked).toBe(true);
  });

  it("读不到配置时禁用保存，避免用空值覆盖库里的内容", async () => {
    getPlayerPlaylist.mockRejectedValue(new Error("boom"));
    const wrapper = mount(PlayerConfigForm);
    await flushPromises();

    expect(wrapper.find(".crt-btn").attributes("disabled")).toBeDefined();
  });
});
