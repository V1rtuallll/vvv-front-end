import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// useGalleryBgm 换成替身：这一层断言的是「一个开关怎么对待两路声音」，
// 播放本身（建元素、循环、登记音量、与侧栏协调）由 useGalleryBgm.test.js 负责。
// activeBgm / paused 是真 ref，模板与开关判据读的就是它们。
const bgmSpies = vi.hoisted(() => ({
  play: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  toggle: vi.fn(),
  // 这一路放到第几秒。真实实现读的是那个从不进 DOM 的元素，这里由用例摆值
  position: vi.fn(() => 0),
}));

// 快照本身的存取（取完即清、过期作废、src 比对）由 resume.test.js 验。
// 这一层要断言的是「点详情那一下带走了什么」—— 那是它与画廊页之间的全部契约
const resumeSpies = vi.hoisted(() => ({ stashResume: vi.fn() }));

vi.mock("@/modules/gallery/resume", () => resumeSpies);

vi.mock("@/modules/gallery/composables/useGalleryBgm", async () => {
  const { ref } = await import("vue");
  const activeBgm = ref(null);
  const paused = ref(false);

  // 三个动作真的翻转这两个 ref：不翻的话，开关停了一次之后仍然读到
  // 「有曲子正在响」，第二次点击会继续按停的那一支。
  // play 保持空替身 —— 它建媒体元素、按地址解析曲目，都由原实现负责，
  // 用例自己把 activeBgm 摆成播放中
  Object.assign(bgmSpies, {
    activeBgm,
    paused,
    stop: vi.fn(() => {
      activeBgm.value = null;
      paused.value = false;
    }),
    pause: vi.fn(() => {
      paused.value = true;
    }),
    resume: vi.fn(() => {
      paused.value = false;
    }),
  });

  return { useGalleryBgm: () => ({ ...bgmSpies }) };
});

// 全站音量层换成替身：这里断言的是「主展示的视频有没有被交出去、什么时候交回去」，
// 写音量本身由 mediaVolume.test.js 负责。
const volumeSpies = vi.hoisted(() => ({
  registerMediaElement: vi.fn(),
  unregisterMediaElement: vi.fn(),
}));

vi.mock("@/modules/player/composables/mediaVolume", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, ...volumeSpies };
});

vi.mock("@/modules/home/composables/useHomeContent", async () => {
  const { ref } = await import("vue");

  const mainItem = ref({
    type: "photo",
    src: "/main.jpg",
    title: "主展示标题",
    description: "主展示描述",
    uploaderUsername: "uploader",
    random: true,
    inGallery: true,
  });
  const galleryItems = ref([
    {
      id: 1,
      type: "photo",
      src: "/masonry.jpg",
      title: "拼图标题",
      description: "拼图描述",
      showInfo: false,
    },
    {
      id: 2,
      type: "video",
      src: "/masonry-2.mp4",
      title: "拼图标题二",
      description: "拼图描述二",
      showInfo: false,
    },
  ]);

  // 和 mainItem / galleryItems 一样**建在工厂里共享**，不能写成 ref(false)：
  // 那样每次调用 useHomeContent() 都是一个新 ref，用例设的那个是野的，
  // 组件读到的仍然恒为 false（`showInfo` 就是老写法留下的坑，这里不要再踩）
  const mainPending = ref(false);

  return {
    useHomeContent: () => ({
      mainItem,
      galleryItems,
      showInfo: ref(false),
      mainPending,
      formatShortDate: () => "2026/9/12",
      changeRandom: vi.fn(),
    }),
  };
});

vi.mock("vue-router", () => ({ useRouter: vi.fn() }));

import { useRouter } from "vue-router";
import { useHomeContent } from "@/modules/home/composables/useHomeContent";
import HomePage from "@/views/home/index.vue";

const stubHover = (matches) => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches })));
};

const galleryItemsOf = () => useHomeContent().galleryItems.value;

describe("Home 页面信息栏", () => {
  beforeEach(() => {
    useHomeContent().showInfo.value = false;
    galleryItemsOf().forEach((item) => {
      item.showInfo = false;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("触屏设备上主展示信息栏无需 hover 即可见", () => {
    stubHover(false);

    const wrapper = mount(HomePage);

    expect(wrapper.find(".showcase-info-bottom").exists()).toBe(true);
    expect(wrapper.find(".uploader-name").text()).toContain("uploader");
  });

  /**
   * 没有描述时说「暂无描述」。alt 里的占位词不能顶上来 ——
   * 服务端会给缺失的 alt 填一个占位字符串，把它当描述显示，
   * 页面上就会出现一个既不是描述、也不像提示的「未知」
   */
  it("主展示没有描述时显示暂无描述，不被 alt 占位词顶替", () => {
    const original = useHomeContent().mainItem.value;
    useHomeContent().mainItem.value = { ...original, description: null, alt: "未知" };

    const wrapper = mount(HomePage);

    expect(wrapper.find(".showcase-desc").text()).toBe("暂无描述");

    useHomeContent().mainItem.value = original;
  });

  it("有描述时照实显示描述本身", () => {
    const original = useHomeContent().mainItem.value;
    useHomeContent().mainItem.value = { ...original, description: "一段真实的描述", alt: "未知" };

    const wrapper = mount(HomePage);

    expect(wrapper.find(".showcase-desc").text()).toBe("一段真实的描述");

    useHomeContent().mainItem.value = original;
  });

  it("画廊渲染列表里的每一张卡，每张都带顶部条、信息栏和底部条", async () => {
    stubHover(true);

    const wrapper = mount(HomePage);
    const cards = wrapper.findAll(".masonry-item");

    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      expect(card.find(".masonry-head").exists()).toBe(true);
      expect(card.find(".masonry-foot").exists()).toBe(true);
      expect(card.find(".gallery-info-bottom").exists()).toBe(true);
    });
  });

  it("画廊信息栏常显，不依赖悬浮也不依赖点击", async () => {
    // 支持 hover 的设备
    stubHover(true);
    const hoverWrapper = mount(HomePage);
    expect(hoverWrapper.find(".masonry-item .gallery-info-bottom").exists()).toBe(true);

    // 触屏设备
    stubHover(false);
    const touchWrapper = mount(HomePage);
    expect(touchWrapper.find(".masonry-item .gallery-info-bottom").exists()).toBe(true);
  });

  it("只有资源确实在画廊里时才给「详情」入口", () => {
    stubHover(true);
    const withDetail = mount(HomePage);
    expect(withDetail.find(".detail-btn").exists()).toBe(true);

    // 类型表里有些素材从没进过画廊，对它们而言链接是死的，不该出现
    useHomeContent().mainItem.value = { ...useHomeContent().mainItem.value, inGallery: false };
    const without = mount(HomePage);
    expect(without.find(".detail-btn").exists()).toBe(false);
  });

  it("支持 hover 的设备上主展示信息栏也常显，「换一个」与上传信息同属左栏", () => {
    stubHover(true);

    const wrapper = mount(HomePage);

    expect(wrapper.find(".showcase-info-bottom").exists()).toBe(true);
    // 按钮和头像、用户名同在 .uploader-left 里，不另起一行
    expect(wrapper.find(".uploader-left .change-btn").exists()).toBe(true);
  });

  /**
   * 服务端没下发上传者时只能显示占位符。
   * 这里曾经是 `|| "V1rtual"` / `|| "刚刚上传"`，等于替服务端编了一条上传事实。
   */
  it("没有上传者信息时显示占位符，不冒充具体的人名和时间", () => {
    stubHover(true);
    useHomeContent().mainItem.value = {
      ...useHomeContent().mainItem.value,
      uploaderUsername: undefined,
      uploaderAvatar: undefined,
      uploadTime: undefined,
    };

    const wrapper = mount(HomePage);
    const info = wrapper.find(".showcase-info-bottom");

    expect(info.find(".uploader-name").text()).toBe("@神秘人");
    expect(info.find(".upload-time").text()).toBe("未知时间");
    // 上传者信息缺一块也不会掉出动作按钮
    expect(info.find(".change-btn").exists()).toBe(true);
  });
});

describe("Home 主展示媒体", () => {
  const 原始主项 = () => ({
    type: "photo",
    src: "/main.jpg",
    title: "主展示标题",
    description: "主展示描述",
    uploaderUsername: "uploader",
  });

  beforeEach(() => {
    useHomeContent().mainItem.value = {
      type: "video",
      src: "/main.mp4",
      title: "主展示视频",
    };
  });

  afterEach(() => {
    useHomeContent().mainItem.value = 原始主项();
    vi.unstubAllGlobals();
  });

  /**
   * 主展示视频自动播放（**不静音**，按用户要求）。
   *
   * 代价已知：用户交互前浏览器会拦下这次 autoplay；交互后它会满音量起播，
   * 而侧栏播放器不会让位，两路会同时响。取消 muted 是用户的选择，不是疏漏。
   */
  it("主展示视频自动播放且不静音，并保留原生控件", () => {
    stubHover(true);

    const wrapper = mount(HomePage);
    const video = wrapper.find("video.showcase-media");

    expect(video.exists()).toBe(true);
    // autoplay / muted 在 jsdom 里的落点不稳定 —— 可能被写进 property，
    // 也可能留在属性上（muted 不是标准的反射属性）。两个都认，
    // 断言的是「确实会静音自动起播」这个行为，而不是它落在哪一层
    const el = video.element;
    expect(el.autoplay === true || el.hasAttribute("autoplay")).toBe(true);
    // 显式断言「没有被静音」—— 去掉 muted 是刻意的，别被顺手加回来
    expect(el.muted === true || el.hasAttribute("muted")).toBe(false);
    expect(el.hasAttribute("controls") || el.controls === true).toBe(true);
  });
});

/**
 * 点「详情」那一下把主展示此刻的状态拍成一张快照交给画廊页：图集翻到第几张、
 * 视频放到第几秒、BGM 放到第几秒。
 *
 * 交接只有这一个时点 —— 详情打开之后两边各播各的，中途不再同步。所以这里既不
 * 挂 watch 也不上报，只在按下去的那一刻读一次当下的状态。
 */
describe("Home 点详情时交接播放进度", () => {
  const 视频组 = () => ({
    type: "video",
    src: "/v1.mp4",
    title: "视频组",
    description: "视频组描述",
    uploaderUsername: "uploader",
    random: true,
    inGallery: true,
    media: [
      { id: 21, src: "/v1.mp4", type: "video" },
      { id: 22, src: "/v2.mp4", type: "video" },
    ],
  });

  let original;

  /** 视频元素的替身槽：jsdom 不做真解码，`currentTime` 写进去不落地 */
  const withElapsed = (el, seconds) => {
    Object.defineProperty(el, "currentTime", { configurable: true, value: seconds });
    return el;
  };

  beforeEach(() => {
    stubHover(true);
    original = useHomeContent().mainItem.value;
    resumeSpies.stashResume.mockClear();
    bgmSpies.position.mockReturnValue(0);
    useRouter.mockReturnValue({ push: vi.fn() });
  });

  afterEach(() => {
    useHomeContent().mainItem.value = original;
    vi.unstubAllGlobals();
  });

  it("把翻到的第几张、视频放到第几秒、BGM 放到第几秒一起带过去", async () => {
    useHomeContent().mainItem.value = 视频组();
    const wrapper = mount(HomePage);
    await wrapper.find(".media-arrow-right").trigger("click");
    withElapsed(wrapper.find("video.showcase-media").element, 37.5);
    bgmSpies.position.mockReturnValue(12.25);

    await wrapper.find(".detail-btn").trigger("click");

    expect(resumeSpies.stashResume).toHaveBeenCalledWith("/v1.mp4", {
      mediaIndex: 1,
      mediaTime: 37.5,
      bgmTime: 12.25,
    });
  });

  /** 图片作品没有视频进度，但图集页码与 BGM 照带 —— 三样各自独立 */
  it("图片作品没有视频进度，另外两样照带", async () => {
    useHomeContent().mainItem.value = {
      ...视频组(),
      type: "photo",
      // 行上的 src 与 media[0] 一致，后端给画廊条目下发的就是这个形状
      src: "/a.jpg",
      media: [
        { id: 31, src: "/a.jpg", type: "photo" },
        { id: 32, src: "/b.jpg", type: "photo" },
        { id: 33, src: "/c.jpg", type: "photo" },
      ],
    };
    const wrapper = mount(HomePage);
    await wrapper.find(".media-arrow-right").trigger("click");
    await wrapper.find(".media-arrow-right").trigger("click");
    bgmSpies.position.mockReturnValue(8);

    await wrapper.find(".detail-btn").trigger("click");

    expect(resumeSpies.stashResume).toHaveBeenCalledWith("/a.jpg", {
      mediaIndex: 2,
      mediaTime: 0,
      bgmTime: 8,
    });
  });

  /** 快照按 src 认领，跳转本身仍是那条 src 深链，两者不能互相顶掉 */
  it("跳转仍是带 src 的深链", async () => {
    useHomeContent().mainItem.value = 视频组();
    const push = vi.fn();
    useRouter.mockReturnValue({ push });
    const wrapper = mount(HomePage);

    await wrapper.find(".detail-btn").trigger("click");

    expect(push).toHaveBeenCalledWith({ path: "/gallery", query: { src: "/v1.mp4" } });
  });

  it("资源不在画廊里时既不给入口也不拍快照", () => {
    useHomeContent().mainItem.value = { ...视频组(), inGallery: false };

    const wrapper = mount(HomePage);

    expect(wrapper.find(".detail-btn").exists()).toBe(false);
    expect(resumeSpies.stashResume).not.toHaveBeenCalled();
  });
});

/**
 * 首页这两处媒体元素直接决定首屏要拉多少字节。画廊里混着用户手机拍的原片，
 * 实测最大的一条 920MB —— 这里的属性写错一个，代价是几百 MB 的流量。
 */
describe("Home 媒体不把首屏拖垮", () => {
  afterEach(() => {
    useHomeContent().mainPending.value = false;
  });

  it("拼图卡的视频只取首帧，不自动播放、不循环", async () => {
    const wrapper = mount(HomePage);
    const cardVideos = wrapper.findAll(".masonry-item video");
    expect(cardVideos).toHaveLength(1);

    // preload=metadata 是「只取容器头就能解出第一帧」的前提（实测 623MB 的文件
    // 只缓冲 3.1 秒 / 全长 300 秒）。autoplay + loop 会让浏览器全量缓冲 ——
    // 写着「显示首帧」的注释，干的却是把整段视频下完的事。
    expect(cardVideos[0].attributes("preload")).toBe("metadata");
    expect(cardVideos[0].attributes("autoplay")).toBeUndefined();
    expect(cardVideos[0].attributes("loop")).toBeUndefined();
  });

  it("主展示抽签未回来时渲染占位，不渲染配置里的兜底媒体", async () => {
    useHomeContent().mainPending.value = true;
    const wrapper = mount(HomePage);

    expect(wrapper.find(".showcase-placeholder").exists()).toBe(true);
    // 兜底那条 1~2 秒后就会被顶掉，先画上去等于连闪一下再白拉一遍媒体
    expect(wrapper.find(".showcase-media-wrapper video").exists()).toBe(false);
    expect(wrapper.find(".showcase-media-wrapper img").exists()).toBe(false);
  });
});

describe("Home 拼图卡进详情", () => {
  it("点击拼图卡跳转到画廊详情，带上该条目的 id", async () => {
    stubHover(true);
    const push = vi.fn();
    useRouter.mockReturnValue({ push });

    const wrapper = mount(HomePage);
    // 点第二张卡：断言取的是条目自己的主键，不是列表序号
    await wrapper.findAll(".masonry-item")[1].trigger("click");

    expect(push).toHaveBeenCalledWith({ path: "/gallery", query: { id: 2 } });
  });

  it("键盘 Enter 与点击等价", async () => {
    stubHover(true);
    const push = vi.fn();
    useRouter.mockReturnValue({ push });

    const wrapper = mount(HomePage);
    await wrapper.findAll(".masonry-item")[0].trigger("keydown.enter");

    expect(push).toHaveBeenCalledWith({ path: "/gallery", query: { id: 1 } });
  });
});

/**
 * 一个开关管两路声音：视频原声与这条作品的背景音乐。
 *
 * 「不区分是 bgm 还是视频的声音」—— 合并前是两个独立按钮，用户想静音得先判断
 * 声音是从哪一路来的，而这两路是同时响的。
 */
describe("Home 主展示的播停开关", () => {
  const BGM_SRC = "https://cdn.example.test/music/a.mp3";
  const VIDEO_ITEM = {
    type: "video",
    src: "/main.mp4",
    title: "主展示视频",
    random: true,
    inGallery: true,
    bgmSrc: BGM_SRC,
    bgmType: "audio",
  };

  const mounted = [];

  const mountHome = () => {
    const wrapper = mount(HomePage);
    mounted.push(wrapper);
    return wrapper;
  };

  beforeEach(() => {
    stubHover(true);
    useRouter.mockReturnValue({ push: vi.fn() });
    bgmSpies.activeBgm.value = null;
    bgmSpies.paused.value = false;
    [
      bgmSpies.play, bgmSpies.stop, bgmSpies.pause, bgmSpies.resume, bgmSpies.toggle,
      volumeSpies.registerMediaElement, volumeSpies.unregisterMediaElement,
    ].forEach((spy) => spy.mockClear());
  });

  // 卸载这一批 wrapper：留着的话它们仍会跟着 mainItem 变，把调用次数搅乱
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
    vi.unstubAllGlobals();
  });

  /**
   * 摆出「两路都在响」。
   *
   * 背景音乐那边：换了 item 的那条 watch 会把配了 bgmSrc 的项交给 `play()`，
   * 替身不建媒体元素，所以这里直接把 `activeBgm` 设成播放中。视频那边：
   * `videoPlaying` 跟着元素自己的 play 事件走，而 jsdom 的 play() / pause()
   * 都是「未实现」的 —— 不改状态、也不派发事件，连 Promise 都不返回。
   * 所以两样都由测试补上：状态是真的，只是触发它的是手工派发的事件。
   */
  const mountPlaying = async () => {
    useHomeContent().mainItem.value = { ...VIDEO_ITEM };
    const wrapper = mountHome();
    bgmSpies.activeBgm.value = { src: BGM_SRC, type: "audio" };

    const video = wrapper.find("video.showcase-media").element;
    vi.spyOn(video, "play").mockResolvedValue(undefined);
    vi.spyOn(video, "pause").mockImplementation(() => {});
    video.dispatchEvent(new Event("play"));
    await nextTick();

    return { wrapper, video };
  };

  it("点一下，视频原声与背景音乐一起停", async () => {
    const { wrapper, video } = await mountPlaying();
    expect(wrapper.find(".icon-btn").attributes("aria-label")).toBe("暂停");

    await wrapper.find(".icon-btn").trigger("click");

    expect(video.pause).toHaveBeenCalled();
    expect(bgmSpies.pause).toHaveBeenCalled();
  });

  it("再点一下，两路一起继续", async () => {
    const { wrapper, video } = await mountPlaying();
    await wrapper.find(".icon-btn").trigger("click");
    // 浏览器在 pause() 之后会派发 pause 事件，jsdom 不会，补上它
    video.dispatchEvent(new Event("pause"));
    await nextTick();
    expect(wrapper.find(".icon-btn").attributes("aria-label")).toBe("播放");

    await wrapper.find(".icon-btn").trigger("click");

    expect(video.play).toHaveBeenCalled();
    expect(bgmSpies.resume).toHaveBeenCalled();
  });

  it("背景音乐不再有自己的开关", async () => {
    const { wrapper } = await mountPlaying();

    // 「换一个」与「详情」是 .change-btn，图标按钮只剩这一个总开关
    expect(wrapper.findAll(".icon-btn")).toHaveLength(1);
  });

  /** 判据是「有没有一路在响」，不区分是哪一路 */
  it("只有背景音乐在响时，开关同样显示为暂停，点了只停这一路", async () => {
    useHomeContent().mainItem.value = {
      type: "photo", src: "/main.jpg", bgmSrc: BGM_SRC, bgmType: "audio",
    };
    const wrapper = mountHome();
    bgmSpies.activeBgm.value = { src: BGM_SRC, type: "audio" };
    await nextTick();

    const button = wrapper.find(".icon-btn");
    expect(button.attributes("aria-label")).toBe("暂停");
    expect(button.find(".ui-icon-pause").exists()).toBe(true);

    await button.trigger("click");

    expect(bgmSpies.pause).toHaveBeenCalled();
  });

  /** 主展示视频登记进全站音量：右栏滑块定音量，它跟着走 */
  it("主展示视频登记进音量层，换成图片后注销", async () => {
    useHomeContent().mainItem.value = { ...VIDEO_ITEM };
    const wrapper = mountHome();
    const video = wrapper.find("video.showcase-media").element;
    // 模板 ref 是在补丁之后的 post 队列里写进去的，等一次 nextTick 才看得到结果
    await nextTick();
    expect(volumeSpies.registerMediaElement).toHaveBeenCalledWith(video);

    useHomeContent().mainItem.value = { type: "photo", src: "/main.jpg" };
    await nextTick();

    expect(volumeSpies.unregisterMediaElement).toHaveBeenCalledWith(video);
  });

  /** 离开首页时元素随之销毁。登记表是模块级的、持有元素本身，不交回去就不会被回收 */
  it("离开首页时注销视频元素", async () => {
    useHomeContent().mainItem.value = { ...VIDEO_ITEM };
    const wrapper = mountHome();
    const video = wrapper.find("video.showcase-media").element;
    await nextTick();

    wrapper.unmount();

    expect(volumeSpies.unregisterMediaElement).toHaveBeenCalledWith(video);
  });

  /** 没有视频、也没有背景音乐时不给开关（原先的视频按钮也是这么藏的） */
  it("没有可停的声音时不给开关", () => {
    useHomeContent().mainItem.value = { type: "photo", src: "/main.jpg" };

    const wrapper = mountHome();

    expect(wrapper.find(".icon-btn").exists()).toBe(false);
  });

  /** 「不动其他逻辑」：换 item 时按 bgmSrc 起播/停播的那段 watch 原样保留 */
  it("换 item 时仍然按 bgmSrc 起播、没有曲子就停播", async () => {
    const plain = { type: "photo", src: "/main.jpg" };
    useHomeContent().mainItem.value = plain;
    mountHome();
    expect(bgmSpies.stop).toHaveBeenCalled();

    const withBgm = { ...plain, bgmSrc: BGM_SRC, bgmType: "audio" };
    useHomeContent().mainItem.value = withBgm;
    await nextTick();
    expect(bgmSpies.play).toHaveBeenCalledWith(withBgm);

    const stopsBefore = bgmSpies.stop.mock.calls.length;
    useHomeContent().mainItem.value = { type: "photo", src: "/other.jpg" };
    await nextTick();

    expect(bgmSpies.stop.mock.calls.length).toBeGreaterThan(stopsBefore);
  });
});

/**
 * 主展示的图集翻页。版式与画廊详情弹窗同一套 —— 同一个作品在两个地方
 * 翻页的手感与判据都该一致，用户不用为同一个操作学两遍。
 */
describe("Home 主展示的图集翻页", () => {
  const 组图 = () => ({
    type: "photo",
    src: "/a.jpg",
    title: "组图",
    description: "组图描述",
    uploaderUsername: "uploader",
    random: true,
    inGallery: true,
    media: [
      { id: 11, src: "/a.jpg", type: "photo" },
      { id: 12, src: "/b.jpg", type: "photo" },
      { id: 13, src: "/c.jpg", type: "photo" },
    ],
  });

  let original;

  beforeEach(() => {
    original = useHomeContent().mainItem.value;
  });

  afterEach(() => {
    useHomeContent().mainItem.value = original;
  });

  it("一条作品有多张媒体时显示左右箭头与计数", () => {
    useHomeContent().mainItem.value = 组图();

    const wrapper = mount(HomePage);

    expect(wrapper.find(".media-arrow-left").exists()).toBe(true);
    expect(wrapper.find(".media-arrow-right").exists()).toBe(true);
    expect(wrapper.find(".media-indicator").text()).toBe("1 / 3");
  });

  it("点右箭头翻到下一张，画面跟着换", async () => {
    useHomeContent().mainItem.value = 组图();
    const wrapper = mount(HomePage);

    await wrapper.find(".media-arrow-right").trigger("click");

    expect(wrapper.find(".media-indicator").text()).toBe("2 / 3");
    expect(wrapper.find("img.showcase-media").attributes("src")).toBe("/b.jpg");
  });

  it("第一张时上一张不可用，最后一张时下一张不可用", async () => {
    useHomeContent().mainItem.value = 组图();
    const wrapper = mount(HomePage);

    expect(wrapper.find(".media-arrow-left").attributes("disabled")).toBeDefined();

    await wrapper.find(".media-arrow-right").trigger("click");
    await wrapper.find(".media-arrow-right").trigger("click");

    expect(wrapper.find(".media-arrow-right").attributes("disabled")).toBeDefined();
  });

  it("只有一张媒体时不显示翻页控件", () => {
    useHomeContent().mainItem.value = { ...组图(), media: [{ id: 11, src: "/a.jpg", type: "photo" }] };

    const wrapper = mount(HomePage);

    expect(wrapper.find(".media-arrow-left").exists()).toBe(false);
    expect(wrapper.find(".media-arrow-right").exists()).toBe(false);
  });

  /** 不回零的话，从第 3 张换到只有 1 张的作品会越界，整块媒体区渲染报错 */
  it("换一条作品时页码归零", async () => {
    useHomeContent().mainItem.value = 组图();
    const wrapper = mount(HomePage);
    await wrapper.find(".media-arrow-right").trigger("click");

    useHomeContent().mainItem.value = { ...组图(), src: "/z.jpg", media: [{ id: 21, src: "/z.jpg", type: "photo" }] };
    await nextTick();

    expect(wrapper.find("img.showcase-media").attributes("src")).toBe("/z.jpg");
    expect(wrapper.find(".media-indicator").exists()).toBe(false);
  });
});
