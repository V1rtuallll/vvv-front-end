import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/home/api/homeApi", () => ({
  getHomeConfig: vi.fn(),
  getRandomGalleries: vi.fn(),
  getFullMediaItem: vi.fn(),
  getRandomMain: vi.fn(),
}));

import {
  getFullMediaItem,
  getHomeConfig,
  getRandomGalleries,
  getRandomMain,
} from "@/modules/home/api/homeApi";
import { useHomeContent } from "@/modules/home/composables/useHomeContent";

const CONFIGURED_SRC = "https://example.test/configured.png";
const RANDOM_SRC = "https://example.test/random.png";

function configPayload(mainOverrides = {}) {
  return {
    data: {
      main: {
        type: "photo",
        src: CONFIGURED_SRC,
        title: "配置标题",
        desc: "配置描述",
        alt: "配置alt",
        random: 1,
        ...mainOverrides,
      },
      galleryItems: [],
    },
  };
}

async function mountHome() {
  let api;
  mount({
    setup() {
      api = useHomeContent();
      return () => null;
    },
  });
  await flushPromises();
  await flushPromises();
  return api;
}

describe("useHomeContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHomeConfig.mockResolvedValue(configPayload());
    getRandomGalleries.mockResolvedValue({ data: [] });
    getFullMediaItem.mockResolvedValue({ data: {} });
    getRandomMain.mockResolvedValue({
      data: {
        src: RANDOM_SRC,
        title: "随机标题",
        description: "随机描述",
        uploaderUsername: "小甜",
        uploadTime: "2026-09-12 10:00",
      },
    });
  });

  it("随机配置下首次加载走 /home/random，不再请求详情接口", async () => {
    const api = await mountHome();

    // 首次加载也要带上 exclude：下方 Random Gallery 那一栏 + 配置里这条自己，
    // 不排的话同一条会在上下两处同时出现
    expect(getRandomMain).toHaveBeenCalledWith({
      type: "photo",
      exclude: "https://example.test/configured.png",
    });
    expect(getFullMediaItem).not.toHaveBeenCalled();
    expect(api.mainItem.value.src).toBe(RANDOM_SRC);
    expect(api.mainItem.value.title).toBe("随机标题");
  });

  it("非随机配置下仍用详情接口补齐元数据", async () => {
    getHomeConfig.mockResolvedValue(configPayload({ random: 0 }));
    getFullMediaItem.mockResolvedValue({ data: { title: "详情标题" } });

    const api = await mountHome();

    expect(getRandomMain).not.toHaveBeenCalled();
    expect(getFullMediaItem).toHaveBeenCalledWith({ src: CONFIGURED_SRC, type: "photo" });
    expect(api.mainItem.value.title).toBe("详情标题");
  });

  it("配置里带的上传者信息直接采用，第二次请求失败也不会丢", async () => {
    getHomeConfig.mockResolvedValue(
      configPayload({
        random: 0,
        uploaderAvatar: "https://example.test/avatar.png",
        uploaderUsername: "小甜",
        uploadTime: "2026-09-12 10:00",
      }),
    );
    // 配置里的 src 定位不到素材时后端返回 404，第二次请求整条失败
    getFullMediaItem.mockRejectedValue(new Error("未找到该资源"));

    const api = await mountHome();

    expect(api.mainItem.value.uploaderUsername).toBe("小甜");
    expect(api.mainItem.value.uploaderAvatar).toBe("https://example.test/avatar.png");
    expect(api.mainItem.value.uploadTime).toBe("2026-09-12 10:00");
  });

  /**
   * 上传者是「关于某条真实上传」的事实，服务端没给就得留空。
   * 以前这里兜底成 V1rtual / 刚刚上传：首屏先显示编造值，
   * 第二次请求再失败的话它们会一直留在页面上。
   */
  it("服务端没给上传者时保持缺省，不编造具体的人名和时间", async () => {
    getHomeConfig.mockResolvedValue(configPayload({ random: 0 }));
    getFullMediaItem.mockRejectedValue(new Error("未找到该资源"));

    const api = await mountHome();

    expect(api.mainItem.value.src).toBe(CONFIGURED_SRC);
    expect(api.mainItem.value.uploaderUsername).toBeUndefined();
    expect(api.mainItem.value.uploaderAvatar).toBeUndefined();
    expect(api.mainItem.value.uploadTime).toBeUndefined();
  });

  it("换一个时把当前 src 作为 exclude 传给后端", async () => {
    const api = await mountHome();
    getRandomMain.mockResolvedValue({ data: { src: "https://example.test/next.png" } });

    await api.changeRandom();

    expect(getRandomMain).toHaveBeenLastCalledWith({ type: "photo", exclude: RANDOM_SRC });
    expect(api.mainItem.value.src).toBe("https://example.test/next.png");
  });

  it("换一个失败时不提交新状态，避免新旧数据混合展示", async () => {
    const api = await mountHome();
    getRandomMain.mockRejectedValue(new Error("boom"));

    await api.changeRandom();

    expect(api.mainItem.value.src).toBe(RANDOM_SRC);
    expect(api.mainItem.value.title).toBe("随机标题");
    // 提示由 request.js 统一负责，这里不应再弹一次（否则是重复提示）
    expect(window.$vmessage.warning).not.toHaveBeenCalled();
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  it("不再向前端暴露可用资源清单", async () => {
    const api = await mountHome();

    expect(api.availableFiles).toBeUndefined();
  });
});
