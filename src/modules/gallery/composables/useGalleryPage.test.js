import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/shared/auth/owner", () => ({ isOwner: vi.fn(() => false) }));
vi.mock("@/modules/user/api/userApi", () => ({ getPublicUser: vi.fn() }));
vi.mock("@/modules/gallery/api/galleryApi", () => ({
  appendGalleryMedia: vi.fn(),
  cancelUpload: vi.fn(),
  getGalleryBgmCandidates: vi.fn(),
  getGalleryComments: vi.fn(),
  getGalleryPage: vi.fn(),
  getUploadLimit: vi.fn(),
  isGalleryLiked: vi.fn(),
  likeGallery: vi.fn(),
  likeGalleryComment: vi.fn(),
  postGalleryComment: vi.fn(),
  replaceGalleryFile: vi.fn(),
  uploadGalleryBgm: vi.fn(),
  uploadGalleryFile: vi.fn(),
  updateGallery: vi.fn(),
  deleteGallery: vi.fn(),
  deleteComment: vi.fn(),
}));

import { isOwner } from "@/shared/auth/owner";
import { useAuthStore } from "@/stores/auth";
import {
  appendGalleryMedia,
  cancelUpload,
  deleteComment,
  deleteGallery,
  getGalleryComments,
  getGalleryPage,
  getUploadLimit,
  likeGalleryComment,
  postGalleryComment,
  replaceGalleryFile,
  uploadGalleryFile,
  updateGallery,
} from "@/modules/gallery/api/galleryApi";
import { getPublicUser } from "@/modules/user/api/userApi";
import { useGalleryPage } from "@/modules/gallery/composables/useGalleryPage";

const ME = 7;
const SOMEONE_ELSE = 8;
const ITEM = { id: 100, title: "旧标题", description: "旧描述", src: "https://example.test/old.png", userId: ME, commentCount: 2 };

function signIn(id) {
  useAuthStore.mockReturnValue({ user: { id, username: "u" + id }, token: "t" });
}

async function mountGallery() {
  let api;
  mount({
    setup() {
      api = useGalleryPage();
      return () => null;
    },
  });
  await flushPromises();
  await flushPromises();
  return api;
}

describe("useGalleryPage 的编辑与删除", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOwner.mockReturnValue(false);
    signIn(ME);
    getGalleryPage.mockResolvedValue({ data: { list: [{ ...ITEM }], total: 1 } });
    getGalleryComments.mockResolvedValue({ data: [] });
  });

  it("作者本人看得到编辑和删除入口", async () => {
    const api = await mountGallery();

    expect(api.canManageItem(api.galleryList.value[0])).toBe(true);
  });

  it("非作者且非管理员看不到入口", async () => {
    signIn(SOMEONE_ELSE);
    const api = await mountGallery();

    expect(api.canManageItem(api.galleryList.value[0])).toBe(false);
  });

  it("管理员看得到任何人的入口", async () => {
    signIn(SOMEONE_ELSE);
    isOwner.mockReturnValue(true);
    const api = await mountGallery();

    expect(api.canManageItem(api.galleryList.value[0])).toBe(true);
  });

  it("id 是字符串时也能对上（后端 Long 序列化后类型不定）", async () => {
    const api = await mountGallery();

    expect(api.canManageItem({ ...ITEM, userId: String(ME) })).toBe(true);
  });

  it("编辑成功后局部更新列表和详情，不重新拉整页", async () => {
    updateGallery.mockResolvedValue({ data: {} });
    const api = await mountGallery();
    api.openDetailModal(api.galleryList.value[0]);
    await flushPromises();
    getGalleryPage.mockClear();

    api.openEditModal(api.galleryList.value[0]);
    api.submitEdit({ title: "新标题" });
    await flushPromises();

    expect(updateGallery).toHaveBeenCalledWith(100, { title: "新标题" });
    expect(api.galleryList.value[0].title).toBe("新标题");
    expect(api.currentItem.value.title).toBe("新标题");
    expect(getGalleryPage).not.toHaveBeenCalled();
    expect(api.editingItem.value).toBeNull();
  });

  it("编辑会作为任务出现在队列里，而不是悄悄发一个请求", async () => {
    updateGallery.mockResolvedValue({ data: {} });
    const api = await mountGallery();
    api.openEditModal(api.galleryList.value[0]);

    api.submitEdit({ title: "新标题" });

    expect(api.uploadItems.value).toHaveLength(1);
    expect(api.uploadItems.value[0].kind).toBe("edit");

    await flushPromises();
    expect(api.uploadItems.value[0].status).toBe("success");
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  it("编辑失败时不改动已展示的数据，也不重复弹错误", async () => {
    updateGallery.mockRejectedValue(new Error("boom"));
    const api = await mountGallery();
    api.openEditModal(api.galleryList.value[0]);

    api.submitEdit({ title: "新标题" });
    await flushPromises();

    expect(api.galleryList.value[0].title).toBe("旧标题");
    expect(api.uploadItems.value[0].status).toBe("failed");
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  /** 取消编辑要把已经改上去的值改回来，否则用户以为取消了、数据却变了 */
  it("编辑中途取消会回滚成原来的值", async () => {
    let releaseFirst;
    updateGallery
      .mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve; }))
      .mockResolvedValue({ data: {} });
    const api = await mountGallery();
    api.openEditModal(api.galleryList.value[0]);
    api.submitEdit({ title: "新标题" });
    await flushPromises();

    const cancelling = api.cancelTask(api.uploadItems.value[0]);
    releaseFirst({ data: {} });
    await cancelling;
    await flushPromises();

    expect(updateGallery).toHaveBeenLastCalledWith(100, { title: "旧标题" });
  });

  it("标题清空属于本地校验，直接拦下不入队", async () => {
    const api = await mountGallery();
    api.openEditModal(api.galleryList.value[0]);

    api.submitEdit({ title: "  " });

    expect(updateGallery).not.toHaveBeenCalled();
    expect(api.uploadItems.value).toHaveLength(0);
    expect(window.$vmessage.warning).toHaveBeenCalled();
  });

  it("选了新文件时换文件与改元数据合成一个任务", async () => {
    replaceGalleryFile.mockResolvedValue({ data: { url: "https://example.test/new.png" } });
    updateGallery.mockResolvedValue({ data: {} });
    const api = await mountGallery();
    const file = new File(["x"], "new.png", { type: "image/png" });

    api.openEditModal(api.galleryList.value[0]);
    api.setReplacementFile(file);
    api.submitEdit({ title: "新标题" });
    await flushPromises();

    expect(api.uploadItems.value).toHaveLength(1);
    expect(api.uploadItems.value[0].kind).toBe("replace");
    expect(replaceGalleryFile).toHaveBeenCalledWith(
      100, expect.any(FormData), expect.any(Function), expect.any(AbortSignal),
    );
    expect(updateGallery).toHaveBeenCalledWith(100, { title: "新标题" });
  });

  it("只选文件不改字段也能保存", async () => {
    replaceGalleryFile.mockResolvedValue({ data: { url: "https://example.test/new.png" } });
    const api = await mountGallery();
    const file = new File(["x"], "new.png", { type: "image/png" });

    api.openEditModal(api.galleryList.value[0]);
    api.setReplacementFile(file);
    api.submitEdit({});
    await flushPromises();

    expect(replaceGalleryFile).toHaveBeenCalled();
    expect(api.uploadItems.value[0].status).toBe("success");
  });

  /** 换完文件界面还显示旧图的话，用户会以为根本没换上 */
  it("换文件后把新地址同步到列表与详情", async () => {
    replaceGalleryFile.mockResolvedValue({ data: { url: "https://example.test/new.png" } });
    const api = await mountGallery();
    api.openDetailModal(api.galleryList.value[0]);
    await flushPromises();
    const file = new File(["x"], "new.png", { type: "image/png" });

    api.openEditModal(api.galleryList.value[0]);
    api.setReplacementFile(file);
    api.submitEdit({});
    await flushPromises();

    expect(api.galleryList.value[0].src).toBe("https://example.test/new.png");
    expect(api.currentItem.value.src).toBe("https://example.test/new.png");
  });

  it("删除成功后从列表移除，并在当前页被删空时回退补数据", async () => {
    deleteGallery.mockResolvedValue({ data: {} });
    const api = await mountGallery();

    api.requestDeleteItem(api.galleryList.value[0]);
    await api.confirmDelete();

    expect(deleteGallery).toHaveBeenCalledWith(100);
    expect(api.galleryList.value).toHaveLength(0);
    expect(api.deleteTarget.value).toBeNull();
  });

  it("删除父评论时连子孙一起从界面移除，并同步评论计数", async () => {
    deleteComment.mockResolvedValue({ data: {} });
    const api = await mountGallery();
    api.currentItem.value = { ...ITEM };
    api.comments.value = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
      { id: 4, parentId: null },
    ];

    api.requestDeleteComment(api.comments.value[0]);
    await api.confirmDelete();

    expect(deleteComment).toHaveBeenCalledWith(1);
    expect(api.comments.value.map((c) => c.id)).toEqual([4]);
    expect(api.currentItem.value.commentCount).toBe(0);
    expect(api.galleryList.value[0].commentCount).toBe(0);
  });

  it("删除失败时保留原数据且不重复弹错误", async () => {
    deleteGallery.mockRejectedValue(new Error("boom"));
    const api = await mountGallery();

    api.requestDeleteItem(api.galleryList.value[0]);
    await api.confirmDelete();

    expect(api.galleryList.value).toHaveLength(1);
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  /** 取消编辑要把 BGM 一起改回去，否则用户以为取消了、曲子却换掉了 */
  it("编辑中途取消会把背景音乐一起回滚", async () => {
    let releaseFirst;
    updateGallery
      .mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve; }))
      .mockResolvedValue({ data: {} });
    const api = await mountGallery();
    const item = { ...api.galleryList.value[0], bgmSrc: "https://cdn.example.test/music/old.mp3", bgmType: "audio" };
    api.galleryList.value = [item];

    api.openEditModal(item);
    api.submitEdit({ bgmSrc: "https://cdn.example.test/music/new.mp3", bgmType: "audio" });
    await flushPromises();

    const cancelling = api.cancelTask(api.uploadItems.value[0]);
    releaseFirst({ data: {} });
    await cancelling;
    await flushPromises();

    expect(updateGallery).toHaveBeenLastCalledWith(100, {
      bgmSrc: "https://cdn.example.test/music/old.mp3",
      bgmType: "audio",
    });
  });
});

describe("useGalleryPage 的日期显示", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOwner.mockReturnValue(false);
    signIn(ME);
    getGalleryPage.mockResolvedValue({ data: { list: [], total: 0 } });
    getGalleryComments.mockResolvedValue({ data: [] });
  });

  /** new Date(null) 会得到 1970-01-01 —— 界面会显示一个像真日期的错误时间 */
  it("时间为空时显示未知时间，而不是 1970 年", async () => {
    const api = await mountGallery();

    expect(api.formatShortDate(null)).toBe("未知时间");
    expect(api.formatShortDate(undefined)).toBe("未知时间");
    expect(api.formatShortDate("")).toBe("未知时间");
  });

  it("时间无法解析时也显示未知时间", async () => {
    const api = await mountGallery();

    expect(api.formatShortDate("不是时间")).toBe("未知时间");
    expect(api.formatDate("不是时间")).toBe("未知时间");
  });

  it("正常时间照常格式化", async () => {
    const api = await mountGallery();

    expect(api.formatShortDate("2026-09-13T15:57:41")).toBe(
      new Date("2026-09-13T15:57:41").toLocaleDateString("zh-CN"),
    );
  });
});

describe("useGalleryPage 的评论回复", () => {
  const COMMENT = { id: 1, username: "甲", parentId: null, createdAt: "2026-01-01T10:00:00" };

  async function openItem() {
    const api = await mountGallery();
    api.currentItem.value = { ...ITEM };
    return api;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    isOwner.mockReturnValue(false);
    signIn(ME);
    getGalleryPage.mockResolvedValue({ data: { list: [{ ...ITEM }], total: 1 } });
    getGalleryComments.mockResolvedValue({ data: [] });
    postGalleryComment.mockResolvedValue({ data: {} });
  });

  it("回复某条评论时带上 parent_id", async () => {
    const api = await openItem();
    api.newComment.value = "回复你";

    api.startReply({ id: 55, username: "小明" });
    await api.postComment();

    expect(postGalleryComment).toHaveBeenCalledWith({
      target_id: 100, content: "回复你", parent_id: 55,
    });
  });

  /** 顶层评论多发一个 parent_id: null 会让载荷多出无意义的字段 */
  it("顶层评论不带 parent_id", async () => {
    const api = await openItem();
    api.newComment.value = "新评论";

    await api.postComment();

    expect(postGalleryComment).toHaveBeenCalledWith({ target_id: 100, content: "新评论" });
  });

  it("发送成功后退出回复态并清空输入", async () => {
    const api = await openItem();
    api.newComment.value = "回复你";
    api.startReply({ id: 55, username: "小明" });

    await api.postComment();

    expect(api.replyTarget.value).toBeNull();
    expect(api.newComment.value).toBe("");
  });

  it("发送失败时保留回复态，用户可以直接重发", async () => {
    postGalleryComment.mockRejectedValue(new Error("boom"));
    const api = await openItem();
    api.newComment.value = "回复你";
    api.startReply({ id: 55, username: "小明" });

    await api.postComment();

    expect(api.replyTarget.value).toEqual({ id: 55, username: "小明" });
    expect(api.newComment.value).toBe("回复你");
  });

  it("关掉详情时清掉回复态", async () => {
    const api = await openItem();
    api.startReply({ id: 55, username: "小明" });

    api.closeDetail();

    expect(api.replyTarget.value).toBeNull();
  });

  it("commentThreads 把回复挂到根评论下，并标出回复的是谁", async () => {
    const api = await openItem();
    api.comments.value = [
      { ...COMMENT, id: 1, username: "甲" },
      { ...COMMENT, id: 2, username: "乙", parentId: 1, createdAt: "2026-01-01T11:00:00" },
      { ...COMMENT, id: 3, username: "丙", parentId: 2, createdAt: "2026-01-01T12:00:00" },
      { ...COMMENT, id: 4, username: "丁", createdAt: "2026-01-01T09:00:00" },
    ];

    const threads = api.commentThreads.value;

    expect(threads.map((thread) => thread.id)).toEqual([1, 4]);
    expect(threads[0].replies.map((reply) => reply.id)).toEqual([2, 3]);
    expect(threads[0].replies[0].replyToName).toBe("甲");
    expect(threads[0].replies[1].replyToName).toBe("乙");
    expect(threads[1].replies).toEqual([]);
  });

  it("线程默认折叠，展开与收起可以来回切", async () => {
    const api = await openItem();

    expect(api.isThreadExpanded(1)).toBe(false);
    api.toggleThread(1);
    expect(api.isThreadExpanded(1)).toBe(true);
    api.toggleThread(1);
    expect(api.isThreadExpanded(1)).toBe(false);
  });

  it("数字与字符串 id 都认，展开状态不会被类型差异绕开", async () => {
    const api = await openItem();

    api.toggleThread(1);

    expect(api.isThreadExpanded("1")).toBe(true);
  });

  /** 发完回复却不展开的话，用户看不到自己刚发的东西，等于白发 */
  it("回复成功后自动展开所在的线程", async () => {
    const api = await openItem();
    api.comments.value = [
      { ...COMMENT, id: 1, username: "甲" },
      { ...COMMENT, id: 2, username: "乙", parentId: 1 },
    ];
    api.newComment.value = "回复你";

    api.startReply({ id: 2, username: "乙" });
    await api.postComment();

    expect(api.isThreadExpanded(1)).toBe(true);
  });

  it("关掉详情时收起全部线程", async () => {
    const api = await openItem();
    api.toggleThread(1);

    api.closeDetail();

    expect(api.isThreadExpanded(1)).toBe(false);
  });

  /** 父评论被删或不在当前页时，回复不能凭空消失 */
  it("找不到父评论的回复仍作为顶层展示", async () => {
    const api = await openItem();
    api.comments.value = [{ ...COMMENT, id: 9, username: "孤儿", parentId: 999 }];

    const threads = api.commentThreads.value;

    expect(threads.map((thread) => thread.id)).toEqual([9]);
    expect(threads[0].replies).toEqual([]);
  });
});

describe("useGalleryPage 的评论加载失败", () => {
  const COMMENT = { id: 1, username: "甲", parentId: null, content: "你好", createdAt: "2026-01-01T10:00:00" };

  async function openItem() {
    const api = await mountGallery();
    await api.openDetailModal(api.galleryList.value[0]);
    return api;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    isOwner.mockReturnValue(false);
    signIn(ME);
    getGalleryPage.mockResolvedValue({ data: { list: [{ ...ITEM }], total: 1 } });
    getGalleryComments.mockResolvedValue({ data: [] });
    postGalleryComment.mockResolvedValue({ data: {} });
    likeGalleryComment.mockResolvedValue({ data: {} });
  });

  /**
   * 取不到评论不等于这条资源没有评论。当成空列表往下传，
   * 弹窗会顶着一句「没有评论」和卡片上的评论数自相矛盾。
   */
  it("打开详情时评论取不到，标记失败而不是当成空列表", async () => {
    getGalleryComments.mockRejectedValue(new Error("boom"));

    const api = await openItem();

    expect(api.currentItem.value.commentsLoadFailed).toBe(true);
    expect(api.comments.value).toEqual([]);
  });

  it("服务端确实返回空列表时不算失败", async () => {
    const api = await openItem();

    expect(api.currentItem.value.commentsLoadFailed).toBe(false);
  });

  it("取不到评论时不重复弹提示（request.js 已经弹过后端消息）", async () => {
    getGalleryComments.mockRejectedValue(new Error("boom"));

    await openItem();

    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  /** 失败一次之后重新打开并取到评论，标记要跟着这一次的结果回到假 */
  it("重新打开时按这一次的结果重置失败标记", async () => {
    getGalleryComments.mockRejectedValue(new Error("boom"));
    const api = await openItem();
    expect(api.currentItem.value.commentsLoadFailed).toBe(true);

    getGalleryComments.mockResolvedValue({ data: [{ ...COMMENT }] });
    await api.openDetailModal(api.galleryList.value[0]);

    expect(api.currentItem.value.commentsLoadFailed).toBe(false);
    expect(api.comments.value).toHaveLength(1);
  });

  /** 已经取到的评论是有效数据，一次刷新失败就清掉，等于又把它当成「没有评论」 */
  it("点赞后的刷新失败保留已经取到的评论，只标记失败", async () => {
    getGalleryComments.mockResolvedValue({ data: [{ ...COMMENT }] });
    const api = await openItem();

    getGalleryComments.mockRejectedValue(new Error("boom"));
    await api.likeComment(api.comments.value[0]);

    expect(api.comments.value).toHaveLength(1);
    expect(api.currentItem.value.commentsLoadFailed).toBe(true);
  });

  /** 评论已经发出去了，刷新失败不能把计数与输入框的状态一起吞掉 */
  it("发评论后的刷新失败，评论照常计数并标记失败", async () => {
    const api = await openItem();
    api.newComment.value = "新评论";

    getGalleryComments.mockRejectedValue(new Error("boom"));
    await api.postComment();

    expect(postGalleryComment).toHaveBeenCalled();
    expect(api.newComment.value).toBe("");
    expect(api.currentItem.value.commentCount).toBe(3);
    expect(api.currentItem.value.commentsLoadFailed).toBe(true);
  });
});

describe("useGalleryPage 的上传队列", () => {
  const picked = (name = "a.png", size = 10) => ({ name, size, type: "image/png" });
  /** 批次载荷：形状与弹窗给出来的一致，多数用例只关心文件名与这一份信息 */
  const batch = (names, extra = {}) => ({
    files: names.map((name) => ({ file: picked(name) })),
    ...extra,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    isOwner.mockReturnValue(false);
    signIn(ME);
    getGalleryPage.mockResolvedValue({ data: { list: [], total: 0 } });
    getUploadLimit.mockResolvedValue({ data: { maxFileSizeBytes: 5 * 1024 * 1024 } });
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("一次发表只产生一个资源", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1, status: "success" } });
    const api = await mountGallery();

    api.publishBatch(batch(["月光.png"], { title: "月光", description: "描述" }));
    await flushPromises();

    expect(api.uploadItems.value).toHaveLength(1);
    expect(uploadGalleryFile).toHaveBeenCalledTimes(1);
  });

  it("发表时带上这一份标题与描述", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1 } });
    const api = await mountGallery();

    api.publishBatch(batch(["a.png"], { title: "我的标题", description: "我的描述" }));
    await flushPromises();

    const sent = uploadGalleryFile.mock.calls[0][0];
    expect(sent.get("title")).toBe("我的标题");
    expect(sent.get("description")).toBe("我的描述");
  });

  it("标题留空时按文件名兜底", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1 } });
    const api = await mountGallery();

    api.publishBatch(batch(["月光.png"], { title: "", description: "" }));
    await flushPromises();

    expect(uploadGalleryFile.mock.calls[0][0].get("title")).toBe("月光");
  });

  it("连续发表多个会各自入队并发跑", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1 } });
    const api = await mountGallery();

    api.publishBatch(batch(["a.png"]));
    api.publishBatch(batch(["b.png"]));
    await flushPromises();

    expect(api.uploadItems.value).toHaveLength(2);
    expect(uploadGalleryFile).toHaveBeenCalledTimes(2);
  });

  it("大小上限提示来自后端配置，前端不写死", async () => {
    getUploadLimit.mockResolvedValue({ data: { maxFileSizeBytes: 20 * 1024 * 1024 } });
    const api = await mountGallery();

    api.openUploadModal();
    await flushPromises();

    expect(getUploadLimit).toHaveBeenCalled();
    expect(api.uploadLimitText.value).toBe("单个文件最大 20 MB");
  });

  it("发表后关掉弹窗，把舞台交给页面里的进度面板", async () => {
    uploadGalleryFile.mockReturnValue(new Promise(() => {}));
    const api = await mountGallery();
    api.openUploadModal();
    expect(api.showUploadModal.value).toBe(true);

    api.publishBatch(batch(["a.png"]));
    await flushPromises();

    expect(api.showUploadModal.value).toBe(false);
    expect(uploadGalleryFile).toHaveBeenCalledTimes(1);
  });

  /** 重新打开弹窗只是为了看进度，不能把正在跑的任务清掉 */
  it("上传进行中重新打开弹窗不会清空队列", async () => {
    uploadGalleryFile.mockReturnValue(new Promise(() => {}));
    const api = await mountGallery();
    api.publishBatch(batch(["a.png"]));
    await flushPromises();

    api.openUploadModal();

    expect(api.uploadItems.value).toHaveLength(1);
    expect(api.uploadItems.value[0].status).toBe("uploading");
  });

  /** 传完不刷新的话，用户看不到自己刚传的东西，会以为传丢了 */
  it("上传成功后自动刷新列表，立刻能看到刚传的内容", async () => {
    let release;
    uploadGalleryFile.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const api = await mountGallery();
    api.publishBatch(batch(["月光.png"], { title: "月光" }));
    await flushPromises();

    getGalleryPage.mockClear();
    getGalleryPage.mockResolvedValue({ data: { list: [{ id: 1, title: "月光" }], total: 1 } });
    release({ data: { id: 1 } });
    await flushPromises();

    expect(getGalleryPage).toHaveBeenCalledTimes(1);
    expect(api.galleryList.value[0].title).toBe("月光");
  });

  /** 并发上传会先后完成，逐个刷新既浪费请求又会让列表闪多次 */
  it("多个上传一起跑完时只刷新一次", async () => {
    const pending = [];
    uploadGalleryFile.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const api = await mountGallery();
    api.publishBatch(batch(["a.png"]));
    api.publishBatch(batch(["b.png"]));
    await flushPromises();

    getGalleryPage.mockClear();
    pending[0]({ data: { id: 1 } });
    await flushPromises();
    expect(getGalleryPage).not.toHaveBeenCalled();

    pending[1]({ data: { id: 2 } });
    await flushPromises();
    expect(getGalleryPage).toHaveBeenCalledTimes(1);
  });

  /** 失败的任务什么都没产生，不该白拉一次列表 */
  it("上传全部失败时不刷新列表", async () => {
    uploadGalleryFile.mockRejectedValue(new Error("boom"));
    const api = await mountGallery();

    api.publishBatch(batch(["a.png"]));
    await flushPromises();
    getGalleryPage.mockClear();
    await flushPromises();

    expect(getGalleryPage).not.toHaveBeenCalled();
  });

  it("上传还在进行时关闭弹窗会先确认", async () => {
    uploadGalleryFile.mockReturnValue(new Promise(() => {}));
    const api = await mountGallery();
    api.publishBatch(batch(["a.png"]));
    await flushPromises();

    api.openUploadModal();
    window.confirm = vi.fn(() => false);
    api.closeUploadModal();

    expect(window.confirm).toHaveBeenCalled();
    expect(api.showUploadModal.value).toBe(true);
  });

  /** 随图配的曲子要真的跟着这一次请求走，否则用户以为配好了、详情里却静默无声 */
  it("发表时把背景音乐一起提交", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1 } });
    const api = await mountGallery();

    api.publishBatch(batch(["a.png"], {
      bgm: { src: "https://cdn.example.test/music/a.mp3", type: "audio" },
    }));
    await flushPromises();

    const sent = uploadGalleryFile.mock.calls[0][0];
    expect(sent.get("bgmSrc")).toBe("https://cdn.example.test/music/a.mp3");
    expect(sent.get("bgmType")).toBe("audio");
  });

  it("不配背景音乐时两个字段都不出现", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1 } });
    const api = await mountGallery();

    api.publishBatch(batch(["a.png"]));
    await flushPromises();

    const sent = uploadGalleryFile.mock.calls[0][0];
    expect(sent.has("bgmSrc")).toBe(false);
    expect(sent.has("bgmType")).toBe(false);
  });
});

describe("useGalleryPage 的多选上传", () => {
  // 真 File：追加请求要按文件名断言，占位对象在这里没有意义
  const entry = (name) => ({ file: new File(["x"], name, { type: "image/png" }) });
  const entries = (...names) => names.map(entry);

  beforeEach(() => {
    vi.clearAllMocks();
    isOwner.mockReturnValue(false);
    signIn(ME);
    getGalleryPage.mockResolvedValue({ data: { list: [], total: 0 } });
    URL.createObjectURL = vi.fn((candidate) => `blob:${candidate.name ?? "preview"}`);
    URL.revokeObjectURL = vi.fn();
    uploadGalleryFile.mockResolvedValue({ data: { id: 42, status: "success" } });
    appendGalleryMedia.mockResolvedValue({ data: { id: 1, src: "s", type: "photo" } });
  });

  it("第一个文件建作品，其余的都追加到这个作品下", async () => {
    const api = await mountGallery();

    api.publishBatch({ files: entries("a.png", "b.png", "c.png"), title: "组图", description: "三张" });
    await flushPromises();

    expect(uploadGalleryFile).toHaveBeenCalledTimes(1);
    expect(appendGalleryMedia).toHaveBeenCalledTimes(2);
    expect(appendGalleryMedia.mock.calls.map(([id]) => id)).toEqual([42, 42]);
    // 标题与描述是作品本身的，只在建作品那一次请求里
    expect(uploadGalleryFile.mock.calls[0][0].get("title")).toBe("组图");
    expect(uploadGalleryFile.mock.calls[0][0].get("description")).toBe("三张");
  });

  it("追加请求只带文件与幂等键", async () => {
    const api = await mountGallery();

    api.publishBatch({ files: entries("a.png", "b.png") });
    await flushPromises();

    expect(appendGalleryMedia).toHaveBeenCalledTimes(1);
    const [, formData] = appendGalleryMedia.mock.calls[0];
    expect(formData.get("file").name).toBe("b.png");
    // 幂等键复用任务自己的 clientUploadId：重放同一份文件不会追加出第二条
    expect(formData.get("clientMediaId")).toBe(api.uploadItems.value[1].clientUploadId);
    expect(formData.has("title")).toBe(false);
    expect(formData.has("description")).toBe(false);
  });

  /**
   * 追加的位置由服务端按 COALESCE(MAX(sort_order)+1, 0) 现算，
   * 两个追加并发到达会取到同一个值，两行的先后就定不下来了 —— 必须一个接一个发。
   */
  it("追加一个接一个发，前一个没落定就不发下一个", async () => {
    const sent = [];
    const pending = [];
    appendGalleryMedia.mockImplementation((id, formData) => {
      sent.push(formData.get("file").name);
      return new Promise((resolve) => pending.push(resolve));
    });
    const api = await mountGallery();

    api.publishBatch({ files: entries("a.png", "b.png", "c.png", "d.png") });
    await flushPromises();

    expect(sent).toEqual(["b.png"]);

    pending[0]({ data: { id: 1 } });
    await flushPromises();
    expect(sent).toEqual(["b.png", "c.png"]);

    pending[1]({ data: { id: 2 } });
    await flushPromises();
    expect(sent).toEqual(["b.png", "c.png", "d.png"]);
  });

  /** 没有作品行，后面的文件无处可加：整批失败，而且原因要写清楚 */
  it("封面失败时整批失败，后面的文件不会去追加", async () => {
    uploadGalleryFile.mockRejectedValue(new Error("网络错误，请稍后重试"));
    const api = await mountGallery();

    api.publishBatch({ files: entries("a.png", "b.png", "c.png") });
    await flushPromises();

    expect(appendGalleryMedia).not.toHaveBeenCalled();
    const appended = api.uploadItems.value.slice(1);
    expect(appended.map((item) => item.status)).toEqual(["failed", "failed"]);
    expect(appended[0].error).toBe("网络错误，请稍后重试");
  });

  /** 封面还在排队时被取消：不会再有结果了，追加任务得带着原因落定，不能一直等 */
  it("封面排队中被取消时，追加任务带着原因失败而不是一直等下去", async () => {
    let releaseUpload;
    const pendingUpload = new Promise((resolve) => { releaseUpload = resolve; });
    uploadGalleryFile.mockImplementation(() => pendingUpload);
    const api = await mountGallery();

    // 先把三个并发位占满，第四个批次的封面才排得上队
    api.publishBatch({ files: entries("x1.png") });
    api.publishBatch({ files: entries("x2.png") });
    api.publishBatch({ files: entries("x3.png") });
    await flushPromises();
    api.publishBatch({ files: entries("a.png", "b.png") });
    await flushPromises();

    const coverItem = api.uploadItems.value[3];
    expect(coverItem.status).toBe("queued");
    await api.cancelTask(coverItem);
    expect(coverItem.status).toBe("cancelled");

    // 腾出一个并发位，排队中的追加才会被投递
    releaseUpload({ data: { id: 1 } });
    await flushPromises();

    expect(api.uploadItems.value[4].status).toBe("failed");
    expect(api.uploadItems.value[4].error).toBe("作品创建失败，未追加");
    expect(appendGalleryMedia).not.toHaveBeenCalled();
  });

  /**
   * 封面失败后用户可以重试。追加任务要认这一次的结果：
   * 记着上一次的失败就会一直报「作品创建失败」，哪怕作品已经建出来了。
   */
  it("重试封面后，追加任务读的是这一次的结果", async () => {
    let releaseCover;
    uploadGalleryFile
      .mockRejectedValueOnce(new Error("网络错误，请稍后重试"))
      .mockImplementationOnce(() => new Promise((resolve) => { releaseCover = resolve; }));
    const api = await mountGallery();

    api.publishBatch({ files: entries("a.png", "b.png") });
    await flushPromises();

    const [coverItem, appendItem] = api.uploadItems.value;
    expect(coverItem.status).toBe("failed");
    expect(appendItem.status).toBe("failed");

    // 用户先重试封面，封面还没跑完又重试了那个文件
    api.retryUpload(coverItem);
    api.retryUpload(appendItem);
    await flushPromises();

    releaseCover({ data: { id: 42 } });
    await flushPromises();

    expect(appendGalleryMedia).toHaveBeenCalledTimes(1);
    expect(appendGalleryMedia.mock.calls[0][0]).toBe(42);
    expect(appendItem.status).toBe("success");
  });

  /** 取消失败的一个追加，不能把排在它后面、还没轮到的文件一起卡住 */
  it("排队中被取消的追加不会挡住后面的文件", async () => {
    let releaseCover;
    const pendingCover = new Promise((resolve) => { releaseCover = resolve; });
    uploadGalleryFile.mockImplementation(() => pendingCover);
    const sent = [];
    const pending = [];
    appendGalleryMedia.mockImplementation((id, formData) => {
      sent.push(formData.get("file").name);
      return new Promise((resolve) => pending.push(resolve));
    });
    const api = await mountGallery();

    // 五个任务抢三个并发位：封面与前两个追加在跑，后两个还在排队
    api.publishBatch({ files: entries("a.png", "b.png", "c.png", "d.png", "e.png") });
    await flushPromises();

    const queued = api.uploadItems.value[3];
    expect(queued.status).toBe("queued");
    await api.cancelTask(queued);

    releaseCover({ data: { id: 42 } });
    await flushPromises();
    expect(sent).toEqual(["b.png"]);

    pending[0]({ data: { id: 1 } });
    await flushPromises();
    expect(sent).toEqual(["b.png", "c.png"]);

    // 被取消的那份没有发出去，轮到的是它后面的文件
    pending[1]({ data: { id: 2 } });
    await flushPromises();
    expect(sent).toEqual(["b.png", "c.png", "e.png"]);
  });
});

describe("useGalleryPage 的用户资料弹窗", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOwner.mockReturnValue(false);
    signIn(ME);
    getGalleryPage.mockResolvedValue({ data: { list: [], total: 0 } });
  });

  it("读到资料时用服务端返回的内容，并打开弹窗", async () => {
    const profile = { id: 3, username: "甲", sex: "FEMALE", description: "你好", createdAt: "2025-01-02T03:04:05" };
    getPublicUser.mockResolvedValue({ data: profile });
    const api = await mountGallery();

    await api.openUserProfile(3, "甲");

    expect(getPublicUser).toHaveBeenCalledWith("甲");
    expect(api.selectedUser.value).toEqual(profile);
    expect(api.showUserProfile.value).toBe(true);
  });

  /**
   * 查不到资料不等于这个人的字段是空值。按默认值补齐会被界面当成服务器返回的事实：
   * 创建时间填成当前时间会读成「今天注册」，性别与描述也会显示成确有其事的样子。
   */
  it("读不到资料时不编造任何字段", async () => {
    getPublicUser.mockRejectedValue(new Error("boom"));
    const api = await mountGallery();

    await api.openUserProfile(9, "查无此人");

    expect(api.selectedUser.value).toEqual({ username: "查无此人", loadFailed: true });
    expect(api.selectedUser.value.createdAt).toBeUndefined();
    expect(api.selectedUser.value.sex).toBeUndefined();
    expect(api.selectedUser.value.description).toBeUndefined();
    expect(api.selectedUser.value.avatar).toBeUndefined();
  });

  it("读不到资料时弹窗照常打开，由弹窗说明情况", async () => {
    getPublicUser.mockRejectedValue(new Error("boom"));
    const api = await mountGallery();

    await api.openUserProfile(9, "查无此人");

    expect(api.showUserProfile.value).toBe(true);
  });

  it("读不到资料时不重复弹提示（request.js 已经弹过后端消息）", async () => {
    getPublicUser.mockRejectedValue(new Error("boom"));
    const api = await mountGallery();

    await api.openUserProfile(9, "查无此人");

    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });
});
