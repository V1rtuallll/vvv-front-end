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

    // 首次加载主展示**先抽**，此刻下面那栏还没取回来，所以 exclude 是空串（见下一条用例）
    expect(getRandomMain).toHaveBeenCalledWith({ type: "photo", exclude: "" });
    expect(getFullMediaItem).not.toHaveBeenCalled();
    expect(api.mainItem.value.src).toBe(RANDOM_SRC);
    expect(api.mainItem.value.title).toBe("随机标题");
  });

  /**
   * **主展示先抽，下方那栏后抽。** 首次加载时主展示不排任何东西 ——
   * 配置里的兜底 src 此刻没上屏（见上一条），当前那条也还不存在。
   *
   * 抽它放在前面还有一个好处：占位只等这一次请求就能撤掉，不用等下面那栏。
   */
  it("首次加载主展示先抽，不排任何东西", async () => {
    getRandomGalleries.mockResolvedValue({
      data: [
        { id: 1, src: "https://example.test/card-a.png" },
        { id: 2, src: "https://example.test/card-b.png" },
      ],
    });

    await mountHome();

    expect(getRandomMain).toHaveBeenCalledWith({ type: "photo", exclude: "" });
    // 顺序本身也是契约的一部分：随机那一次必须发生在取下方卡片之前
    expect(getRandomMain.mock.invocationCallOrder[0])
      .toBeLessThan(getRandomGalleries.mock.invocationCallOrder[0]);
  });

  /**
   * 下方那 4 张**不排主展示**（用户 2026-09-28 决定）：上下允许重复，
   * 主展示那一路要是完全自由的随机。
   *
   * 四条彼此之间不重复 —— 那由后端 `ORDER BY RAND() LIMIT 8` 保证（一条 gallery 行
   * 只出一行），前端只负责截前四条。
   */
  it("下方卡片不排主展示，上下允许重复", async () => {
    getRandomGalleries.mockResolvedValue({
      data: [
        { id: 9, src: RANDOM_SRC },
        { id: 1, src: "https://example.test/card-a.png" },
        { id: 2, src: "https://example.test/card-b.png" },
        { id: 3, src: "https://example.test/card-c.png" },
        { id: 4, src: "https://example.test/card-d.png" },
      ],
    });

    const api = await mountHome();

    expect(api.mainItem.value.src).toBe(RANDOM_SRC);
    // 主展示那条照样出现在下方 —— 不排
    expect(api.galleryItems.value.map((item) => item.src)).toEqual([
      RANDOM_SRC,
      "https://example.test/card-a.png",
      "https://example.test/card-b.png",
      "https://example.test/card-c.png",
    ]);
  });

  /**
   * 随机模式下抽签要 1~2 秒才出结果，这期间**不能**把配置里的兜底 src 传下去：
   * 它会被顶掉，等于连闪一下再白拉一遍媒体。页面据 mainPending 渲染占位。
   *
   * 注意这和「换一个失败时不提交新状态」不冲突：那一条说的是**点换一个**时，
   * 当前这条还在画面上，留着它就对了；首次加载时画面本来空着，必须放点东西回去。
   */
  it("随机模式首次加载先置占位，不把兜底 src 传下去", async () => {
    let api;
    let settle;
    getRandomMain.mockReturnValue(new Promise((resolve) => { settle = resolve; }));
    mount({
      setup() {
        api = useHomeContent();
        return () => null;
      },
    });
    await flushPromises();
    await flushPromises();

    expect(api.mainPending.value).toBe(true);
    expect(api.mainItem.value.src).toBe(null);
    // 标题与描述照旧下发：只有媒体那一格被摘掉
    expect(api.mainItem.value.title).toBe("配置标题");

    settle({ data: { src: RANDOM_SRC, title: "随机标题" } });
    await flushPromises();

    expect(api.mainPending.value).toBe(false);
    expect(api.mainItem.value.src).toBe(RANDOM_SRC);
  });

  /**
   * 兜底值存在的意义就是抽签失败的那一刻。不放回去的话占位会一直挂着，
   * 用户看到的是一片空 —— 那比看到一条过时的素材更糟。
   */
  it("随机请求失败时把兜底值放回画面并解除占位", async () => {
    getRandomMain.mockRejectedValue(new Error("boom"));

    const api = await mountHome();

    expect(api.mainPending.value).toBe(false);
    expect(api.mainItem.value.src).toBe(CONFIGURED_SRC);
  });

  /** 非随机模式下配置的 src 就是要展示的那一条，没有等待期 */
  it("非随机模式不置占位", async () => {
    getHomeConfig.mockResolvedValue(configPayload({ random: 0 }));

    const api = await mountHome();

    expect(api.mainPending.value).toBe(false);
    expect(api.mainItem.value.src).toBe(CONFIGURED_SRC);
  });

  /**
   * 占位从「配置回来」那一刻就挂上了，后面还有取卡片那一步 —— 它挂了也得解除占位。
   *
   * ⚠️ 但**不能顺手把主展示也换掉**：主展示是先抽的，那一步已经成功了，
   * 取卡片失败跟它没有关系。无脑退回兜底值会把一条抽好的随机结果换成配置里那条。
   */
  it("取下方卡片失败时解除占位，但不动已经抽好的主展示", async () => {
    getRandomGalleries.mockRejectedValue(new Error("boom"));

    const api = await mountHome();

    expect(api.mainPending.value).toBe(false);
    expect(api.mainItem.value.src).toBe(RANDOM_SRC);
  });

  /** 主展示自己就抽不到（0 条池子等）时，兜底值才是该上场的那一个 */
  it("主展示抽不到时才退回兜底值", async () => {
    getRandomMain.mockRejectedValue(new Error("boom"));

    const api = await mountHome();

    expect(api.mainPending.value).toBe(false);
    expect(api.mainItem.value.src).toBe(CONFIGURED_SRC);
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

    // 排的是**首次抽中并已显示**的那条（RANDOM_SRC），不是配置里的兜底值 ——
    // 后者从头到尾没上过屏
    expect(getRandomMain).toHaveBeenLastCalledWith({ type: "photo", exclude: RANDOM_SRC });
    expect(api.mainItem.value.src).toBe("https://example.test/next.png");
  });

  /**
   * 「换一个」只排当前这条，**不排下方那栏** —— 跟首次加载同一个口径：
   * 上下允许重复，主展示那一路不跟任何人互相躲。
   */
  it("换一个只排当前那条，不排下方卡片", async () => {
    getRandomGalleries.mockResolvedValue({
      data: [
        { id: 1, src: "https://example.test/card-a.png" },
        { id: 2, src: "https://example.test/card-b.png" },
      ],
    });
    const api = await mountHome();
    getRandomMain.mockResolvedValue({ data: { src: "https://example.test/next.png" } });

    await api.changeRandom();

    expect(getRandomMain).toHaveBeenLastCalledWith({ type: "photo", exclude: RANDOM_SRC });
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
