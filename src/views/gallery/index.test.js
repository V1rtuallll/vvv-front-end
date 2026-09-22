import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/shared/auth/owner", () => ({ isOwner: vi.fn(() => false) }));
vi.mock("@/modules/user/api/userApi", () => ({ getPublicUser: vi.fn() }));
vi.mock("@/modules/gallery/api/galleryApi", () => ({
  cancelUpload: vi.fn(),
  commitGalleryMedia: vi.fn(),
  getGalleryBgmCandidates: vi.fn(),
  getGalleryComments: vi.fn(),
  getGalleryItem: vi.fn(),
  getGalleryPage: vi.fn(),
  getUploadLimit: vi.fn(),
  isGalleryLiked: vi.fn(),
  likeGallery: vi.fn(),
  likeGalleryComment: vi.fn(),
  postGalleryComment: vi.fn(),
  uploadGalleryBgm: vi.fn(),
  uploadGalleryFile: vi.fn(),
  deleteGallery: vi.fn(),
  deleteComment: vi.fn(),
}));

import { useAuthStore } from "@/stores/auth";
import {
  commitGalleryMedia,
  deleteComment,
  getGalleryComments,
  getGalleryItem,
  getGalleryPage,
  getUploadLimit,
  postGalleryComment,
} from "@/modules/gallery/api/galleryApi";
import GalleryPage from "@/views/gallery/index.vue";

const ITEM = { id: 100, title: "月光", description: "描述", type: "photo", src: "/a.png", userId: 7, likes: 1, commentCount: 0 };

// userId 与登录用户一致：自己发的评论才看得到删除入口
const COMMENT = { id: 500, content: "一条评论", userId: 7, username: "u7", parentId: null, likes: 0, isLiked: false };

/**
 * 挂载页面。必须装 router：侧栏深链那套逻辑读 route.query.id，
 * 没有活动路由时 useRoute() 直接抛。
 */
async function mountPage(path = "/gallery") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/gallery", component: { template: "<div />" } }],
  });
  await router.push(path);
  await router.isReady();

  const wrapper = mount(GalleryPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

/** 打开详情弹窗：评论输入与发送都在这里面 */
async function openDetail() {
  const { wrapper } = await mountPage();
  await wrapper.find(".gallery-card").trigger("click");
  await flushPromises();
  return wrapper;
}

/** jsdom 的 file input 上 files 是只读的，只能这样塞进去 */
async function pickFile(input, file) {
  Object.defineProperty(input.element, "files", { value: [file], configurable: true });
  await input.trigger("change");
}

describe("Gallery 页面的评论", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: { id: 7, username: "u7" }, token: "t" });
    getGalleryPage.mockResolvedValue({ data: { list: [{ ...ITEM }], total: 1 } });
    getGalleryComments.mockResolvedValue({ data: [] });
    getUploadLimit.mockResolvedValue({ data: { maxFileSizeBytes: 1024 } });
    postGalleryComment.mockResolvedValue({ data: {} });
  });

  it("输入内容后发送按钮可用，点击后带着资源 ID 发出请求", async () => {
    const wrapper = await openDetail();

    const textarea = wrapper.find(".comment-input textarea");
    expect(textarea.exists()).toBe(true);

    await textarea.setValue("写得真好");

    const send = wrapper.find(".send-btn");
    expect(send.attributes("disabled")).toBeUndefined();

    await send.trigger("click");
    await flushPromises();

    expect(postGalleryComment).toHaveBeenCalledWith({ target_id: 100, content: "写得真好" });
  });

  it("发送成功后清空输入框并重新拉取评论", async () => {
    const wrapper = await openDetail();
    await wrapper.find(".comment-input textarea").setValue("写得真好");

    await wrapper.find(".send-btn").trigger("click");
    await flushPromises();

    expect(wrapper.find(".comment-input textarea").element.value).toBe("");
    expect(getGalleryComments).toHaveBeenCalledTimes(2);
  });

  it("内容为空时发送按钮不可用", async () => {
    const wrapper = await openDetail();

    expect(wrapper.find(".send-btn").attributes("disabled")).toBeDefined();
  });

  const EXISTING = {
    id: 55, username: "小明", content: "说点什么", parentId: null,
    likes: 0, createdAt: "2026-01-01T10:00:00",
  };

  it("点回复再发送，请求里带上被回复的评论 ID", async () => {
    getGalleryComments.mockResolvedValue({ data: [{ ...EXISTING }] });
    const wrapper = await openDetail();

    await wrapper.find(".comment-reply-btn").trigger("click");
    expect(wrapper.find(".reply-banner").text()).toContain("小明");

    await wrapper.find(".comment-input textarea").setValue("回复你");
    await wrapper.find(".send-btn").trigger("click");
    await flushPromises();

    expect(postGalleryComment).toHaveBeenCalledWith({
      target_id: 100, content: "回复你", parent_id: 55,
    });
  });

  it("子评论默认折叠，点展开后才出现", async () => {
    getGalleryComments.mockResolvedValue({
      data: [
        { ...EXISTING, id: 55 },
        { ...EXISTING, id: 56, username: "小红", parentId: 55, content: "子评论内容" },
      ],
    });
    const wrapper = await openDetail();

    expect(wrapper.find(".comment-reply-item").exists()).toBe(false);
    expect(wrapper.find(".comment-replies-toggle").text()).toContain("展开回复 (1)");

    await wrapper.find(".comment-replies-toggle").trigger("click");

    const replies = wrapper.findAll(".comment-reply-item");
    expect(replies).toHaveLength(1);
    expect(replies[0].text()).toContain("子评论内容");
  });

  /** 发完回复却看不到，用户会以为没发出去 */
  it("发出的回复立刻可见：自动展开它所在的线程", async () => {
    getGalleryComments.mockResolvedValue({ data: [{ ...EXISTING, id: 55 }] });
    const wrapper = await openDetail();

    await wrapper.find(".comment-reply-btn").trigger("click");
    await wrapper.find(".comment-input textarea").setValue("回复你");
    // 发送后后端会返回带新回复的列表
    getGalleryComments.mockResolvedValue({
      data: [
        { ...EXISTING, id: 55 },
        { ...EXISTING, id: 56, username: "我", parentId: 55, content: "回复你" },
      ],
    });
    await wrapper.find(".send-btn").trigger("click");
    await flushPromises();

    const replies = wrapper.findAll(".comment-reply-item");
    expect(replies).toHaveLength(1);
    expect(replies[0].text()).toContain("回复你");
  });

  it("取消回复后回到顶层评论", async () => {
    getGalleryComments.mockResolvedValue({ data: [{ ...EXISTING }] });
    const wrapper = await openDetail();

    await wrapper.find(".comment-reply-btn").trigger("click");
    await wrapper.find(".reply-cancel").trigger("click");
    expect(wrapper.find(".reply-banner").exists()).toBe(false);

    await wrapper.find(".comment-input textarea").setValue("新评论");
    await wrapper.find(".send-btn").trigger("click");
    await flushPromises();

    expect(postGalleryComment).toHaveBeenCalledWith({ target_id: 100, content: "新评论" });
  });

  it("删除评论先弹项目自己的确认框，确认后才发请求", async () => {
    getGalleryComments.mockResolvedValue({ data: [{ ...COMMENT }] });
    const wrapper = await openDetail();

    await wrapper.find(".comment-delete-btn").trigger("click");

    // 弹窗要盖在详情弹窗之上（ConfirmDialog 1100 > 详情 999），否则用户以为点了没反应
    expect(wrapper.find(".confirm-modal h2").text()).toBe("删除评论");
    expect(deleteComment).not.toHaveBeenCalled();

    await wrapper.find(".confirm-btn").trigger("click");
    await flushPromises();

    expect(deleteComment).toHaveBeenCalledWith(500);
  });

  it("取消删除评论不发请求", async () => {
    getGalleryComments.mockResolvedValue({ data: [{ ...COMMENT }] });
    const wrapper = await openDetail();

    await wrapper.find(".comment-delete-btn").trigger("click");
    await wrapper.find(".cancel-btn").trigger("click");

    expect(deleteComment).not.toHaveBeenCalled();
    expect(wrapper.find(".confirm-modal").exists()).toBe(false);
  });
});

describe("Gallery 页面的侧栏深链", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: { id: 7, username: "u7" }, token: "t" });
    getGalleryPage.mockResolvedValue({ data: { list: [{ ...ITEM }], total: 1 } });
    getGalleryComments.mockResolvedValue({ data: [] });
    getUploadLimit.mockResolvedValue({ data: { maxFileSizeBytes: 1024 } });
  });

  it("目标已经在当前页里时直接打开，不额外发请求", async () => {
    const { wrapper, router } = await mountPage();
    await router.push("/gallery?id=100");
    await flushPromises();

    expect(wrapper.find(".modal-overlay").exists()).toBe(true);
    expect(wrapper.find(".detail-modal h2").text()).toBe("月光");
    expect(getGalleryItem).not.toHaveBeenCalled();
  });

  /** 默认一页 4 条，目标多半不在当前页；只认当前页的话深链就永远打不开 */
  it("?id= 不在当前页时按 id 单独查一次，用返回的那一行打开", async () => {
    getGalleryItem.mockResolvedValue({ data: { ...ITEM, id: 999, title: "深链目标" } });

    const { wrapper } = await mountPage("/gallery?id=999");

    expect(getGalleryItem).toHaveBeenCalledWith({ id: "999" });
    expect(wrapper.find(".detail-modal h2").text()).toBe("深链目标");
  });

  /** 首页主展示走的是 /home/random，没有主键，只能用 src 定位 */
  it("?src= 指向不在当前页的资源时也打开", async () => {
    getGalleryItem.mockResolvedValue({ data: { ...ITEM, id: 999, title: "主展示资源" } });

    const { wrapper } = await mountPage("/gallery?src=%2Frandom%2Fb.png");

    expect(getGalleryItem).toHaveBeenCalledWith({ src: "/random/b.png" });
    expect(wrapper.find(".detail-modal h2").text()).toBe("主展示资源");
  });

  /** 主展示的资源可能从没进过画廊，接口回 404 —— 这是合法状态，不是错误 */
  it("深链查不到时不弹窗也不弹提示，地址里的 query 一并清掉", async () => {
    getGalleryItem.mockRejectedValue(Object.assign(new Error("资源不存在"), {
      response: { status: 404, data: { code: 404, msg: "资源不存在" } },
    }));

    const { wrapper, router } = await mountPage("/gallery?src=%2Frandom%2Fgone.png");

    expect(wrapper.find(".modal-overlay").exists()).toBe(false);
    // 提示由 request.js 负责，页面不再补一条
    expect(window.$vmessage.error).not.toHaveBeenCalled();
    expect(router.currentRoute.value.query.src).toBeUndefined();
  });

  it("关掉详情把 id 从地址里撤掉，同一条才点得开第二次", async () => {
    getGalleryItem.mockResolvedValue({ data: { ...ITEM } });
    const { wrapper, router } = await mountPage("/gallery?id=100");

    await wrapper.find(".detail-modal .close-btn").trigger("click");
    await flushPromises();

    expect(wrapper.find(".modal-overlay").exists()).toBe(false);
    expect(router.currentRoute.value.query.id).toBeUndefined();

    // 地址里已经没有 query，同一条链接重新点一次仍然打得开
    await router.push("/gallery?id=100");
    await flushPromises();

    expect(wrapper.find(".detail-modal h2").text()).toBe("月光");
  });

  it("已经在页面上时换一个 id 会换成那一条的详情", async () => {
    getGalleryPage.mockResolvedValue({
      data: { list: [{ ...ITEM }, { ...ITEM, id: 200, title: "海潮" }], total: 2 },
    });
    const { wrapper, router } = await mountPage();
    await router.push("/gallery?id=100");
    await flushPromises();
    expect(wrapper.find(".detail-modal h2").text()).toBe("月光");

    await router.push("/gallery?id=200");
    await flushPromises();

    expect(wrapper.find(".detail-modal h2").text()).toBe("海潮");
  });

  /**
   * 深链消费掉之后 query 必须从地址里消失。留着的话每次列表重载（换页、上传完成、
   * 删除）都会把同一条再弹一次 —— 用户看到的是一条自己没点过的详情盖在页面上。
   */
  it("深链消费之后，列表再刷新不会把弹窗重新弹出来", async () => {
    getGalleryPage.mockResolvedValue({ data: { list: [{ ...ITEM, id: 200, title: "海潮" }], total: 9 } });
    getGalleryItem.mockResolvedValue({ data: { ...ITEM, id: 100, title: "月光" } });

    const { wrapper, router } = await mountPage("/gallery?id=100");
    expect(wrapper.find(".detail-modal h2").text()).toBe("月光");
    expect(router.currentRoute.value.query.id).toBeUndefined();

    await wrapper.find(".detail-modal .close-btn").trigger("click");
    await flushPromises();

    // 重拉一次列表，回来的数据里带着刚才那一条
    getGalleryPage.mockResolvedValue({ data: { list: [{ ...ITEM, id: 100, title: "月光" }], total: 9 } });
    await wrapper.find(".page-size-select").setValue("6");
    await flushPromises();

    expect(wrapper.find(".modal-overlay").exists()).toBe(false);
  });

  /** 在途的深链请求回来时，用户已经在看别的东西了 —— 不能把她正在看的那条顶掉 */
  it("请求在途时用户打开了别的条目，晚到的响应被丢弃", async () => {
    let resolveDeepLink;
    getGalleryItem.mockImplementation(() => new Promise((resolve) => { resolveDeepLink = resolve; }));
    getGalleryPage.mockResolvedValue({
      data: { list: [{ ...ITEM }, { ...ITEM, id: 200, title: "海潮" }], total: 2 },
    });

    const { wrapper, router } = await mountPage("/gallery?id=999");
    await wrapper.findAll(".gallery-card")[1].trigger("click");
    await flushPromises();
    expect(wrapper.find(".detail-modal h2").text()).toBe("海潮");

    resolveDeepLink({ data: { ...ITEM, id: 999, title: "深链目标" } });
    await flushPromises();

    expect(wrapper.find(".detail-modal h2").text()).toBe("海潮");
    // 作废的深链也不留在地址里
    expect(router.currentRoute.value.query.id).toBeUndefined();
  });

  it("组件已经卸载时到达的响应不再产生任何动作", async () => {
    let resolveDeepLink;
    getGalleryItem.mockImplementation(() => new Promise((resolve) => { resolveDeepLink = resolve; }));

    const { wrapper } = await mountPage("/gallery?id=999");
    wrapper.unmount();

    resolveDeepLink({ data: { ...ITEM, id: 999, title: "深链目标" } });
    await flushPromises();

    // 打开详情会去拉评论；组件都没了，这个请求不该发出去
    expect(getGalleryComments).not.toHaveBeenCalled();
  });
});

describe("Gallery 页面的编辑弹窗", () => {
  const MEDIA = [
    { id: 11, src: "/a.png", type: "photo" },
    { id: 12, src: "/b.png", type: "photo" },
  ];
  /** 一个作品：src / type 就是 media[0]，服务端保证两者一致 */
  const WORK = { ...ITEM, id: 400, title: "旧标题", src: "/a.png", type: "photo", media: MEDIA };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: { id: 7, username: "u7" }, token: "t" });
    getGalleryComments.mockResolvedValue({ data: [] });
    getUploadLimit.mockResolvedValue({ data: { maxFileSizeBytes: 1024 } });
    getGalleryPage.mockResolvedValue({ data: { list: [{ ...WORK }], total: 1 } });
    commitGalleryMedia.mockResolvedValue({ data: { ...WORK } });
    URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
    URL.revokeObjectURL = vi.fn();
  });

  /** 打开详情，再从详情里进编辑弹窗 */
  async function openEdit() {
    const { wrapper } = await mountPage();
    await wrapper.find(".gallery-card").trigger("click");
    await flushPromises();
    await wrapper.find(".detail-edit-btn").trigger("click");
    await flushPromises();
    return wrapper;
  }

  /** 草稿语义是这一轮的核心：没点保存就一次请求都不该发出去 */
  it("删掉一条媒体再取消，服务端零调用", async () => {
    const wrapper = await openEdit();

    await wrapper.find(".media-row:nth-child(2) .media-remove").trigger("click");

    expect(wrapper.findAll(".media-row")).toHaveLength(1);
    expect(commitGalleryMedia).not.toHaveBeenCalled();

    await wrapper.find(".cancel-btn").trigger("click");

    expect(commitGalleryMedia).not.toHaveBeenCalled();
    expect(wrapper.find(".edit-modal").exists()).toBe(false);
  });

  it("保存把整组媒体按用户排好的顺序发出去", async () => {
    const wrapper = await openEdit();

    await wrapper.find(".media-row:nth-child(2) .media-move-up").trigger("click");
    await wrapper.find(".save-btn").trigger("click");
    await flushPromises();

    const payload = JSON.parse(commitGalleryMedia.mock.calls[0][1].get("payload"));
    expect(commitGalleryMedia).toHaveBeenCalledWith(
      400, expect.any(FormData), expect.any(Function), expect.any(AbortSignal),
    );
    expect(payload.items).toEqual([{ mediaId: 12 }, { mediaId: 11 }]);
  });

  it("换掉封面并保存后，卡片与详情一起换成新封面", async () => {
    const wrapper = await openEdit();

    await pickFile(wrapper.find(".media-row:nth-child(1) .media-file-input"), new File(["x"], "new.png", { type: "image/png" }));
    commitGalleryMedia.mockResolvedValue({
      data: { ...WORK, src: "/new.png", media: [{ id: 21, src: "/new.png", type: "photo" }] },
    });
    await wrapper.find(".save-btn").trigger("click");
    await flushPromises();

    expect(wrapper.find(".gallery-card .media-preview").attributes("src")).toBe("/new.png");
    expect(wrapper.find(".detail-modal .detail-media").attributes("src")).toBe("/new.png");
  });
});

describe("Gallery 列表里的音乐项", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: { id: 7, username: "u7" }, token: "t" });
    getGalleryComments.mockResolvedValue({ data: [] });
    getUploadLimit.mockResolvedValue({ data: { maxFileSizeBytes: 1024 } });
    getGalleryPage.mockResolvedValue({
      data: {
        list: [{ ...ITEM, id: 300, type: "music", title: "一首歌", src: "https://cdn/song.mp3" }],
        total: 1,
      },
    });
  });

  it("音乐项不是播放器，只留一个入口占位", async () => {
    const { wrapper } = await mountPage();

    // 一页 6 个 <audio controls> 会一起加载解码，播放与暂停放到详情弹窗里
    expect(wrapper.find(".gallery-card audio").exists()).toBe(false);
    // 占位不再用 ♪ 这类 emoji，改成统一的 UI 图标
    expect(wrapper.find(".media-audio-placeholder .ui-icon-music").exists()).toBe(true);
  });

  it("音乐项仍然点得进详情，详情里才有能播放、能暂停的播放器", async () => {
    const { wrapper } = await mountPage();

    await wrapper.find(".gallery-card").trigger("click");
    await flushPromises();

    const audio = wrapper.find(".detail-modal audio");
    expect(audio.exists()).toBe(true);
    expect(audio.attributes("src")).toBe("https://cdn/song.mp3");
    expect(audio.attributes("controls")).toBeDefined();
  });
});

describe("Gallery 卡片的媒体张数", () => {
  const MEDIA = [
    { id: 1, src: "/a.png", type: "photo" },
    { id: 2, src: "/b.png", type: "photo" },
    { id: 3, src: "/c.mp4", type: "video" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: { id: 7, username: "u7" }, token: "t" });
    getGalleryComments.mockResolvedValue({ data: [] });
    getUploadLimit.mockResolvedValue({ data: { maxFileSizeBytes: 1024 } });
    getGalleryPage.mockResolvedValue({
      data: { list: [{ ...ITEM, id: 400, media: MEDIA }], total: 1 },
    });
  });

  /** 卡片只显示封面的类型，作品里有几条媒体不点开看不出来 */
  it("一个作品有多条媒体时在类型条上标出张数", async () => {
    const { wrapper } = await mountPage();

    expect(wrapper.find(".card-foot").text()).toContain("PHOTO");
    expect(wrapper.find(".card-media-count").text()).toBe("3 张");
  });

  it("只有封面的作品不标张数", async () => {
    getGalleryPage.mockResolvedValue({
      data: { list: [{ ...ITEM, id: 401, media: [MEDIA[0]] }], total: 1 },
    });

    const { wrapper } = await mountPage();

    expect(wrapper.find(".card-media-count").exists()).toBe(false);
  });
});
