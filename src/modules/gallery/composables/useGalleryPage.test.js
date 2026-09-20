import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/shared/auth/owner", () => ({ isOwner: vi.fn(() => false) }));
vi.mock("@/modules/user/api/userApi", () => ({ getPublicUser: vi.fn() }));
vi.mock("@/modules/gallery/api/galleryApi", () => ({
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
  cancelUpload,
  deleteComment,
  deleteGallery,
  getGalleryComments,
  getGalleryPage,
  getUploadLimit,
  postGalleryComment,
  replaceGalleryFile,
  uploadGalleryFile,
  updateGallery,
} from "@/modules/gallery/api/galleryApi";
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

describe("useGalleryPage 的上传队列", () => {
  const picked = (name = "a.png", size = 10) => ({ name, size, type: "image/png" });

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

    api.publishOne({ file: picked("月光.png"), title: "月光", description: "描述" });
    await flushPromises();

    expect(api.uploadItems.value).toHaveLength(1);
    expect(uploadGalleryFile).toHaveBeenCalledTimes(1);
  });

  it("发表时带上这一份标题与描述", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1 } });
    const api = await mountGallery();

    api.publishOne({ file: picked("a.png"), title: "我的标题", description: "我的描述" });
    await flushPromises();

    const sent = uploadGalleryFile.mock.calls[0][0];
    expect(sent.get("title")).toBe("我的标题");
    expect(sent.get("description")).toBe("我的描述");
  });

  it("标题留空时按文件名兜底", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1 } });
    const api = await mountGallery();

    api.publishOne({ file: picked("月光.png"), title: "", description: "" });
    await flushPromises();

    expect(uploadGalleryFile.mock.calls[0][0].get("title")).toBe("月光");
  });

  it("连续发表多个会各自入队并发跑", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1 } });
    const api = await mountGallery();

    api.publishOne({ file: picked("a.png") });
    api.publishOne({ file: picked("b.png") });
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

    api.publishOne({ file: picked("a.png") });
    await flushPromises();

    expect(api.showUploadModal.value).toBe(false);
    expect(uploadGalleryFile).toHaveBeenCalledTimes(1);
  });

  /** 重新打开弹窗只是为了看进度，不能把正在跑的任务清掉 */
  it("上传进行中重新打开弹窗不会清空队列", async () => {
    uploadGalleryFile.mockReturnValue(new Promise(() => {}));
    const api = await mountGallery();
    api.publishOne({ file: picked("a.png") });
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
    api.publishOne({ file: picked("月光.png"), title: "月光" });
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
    api.publishOne({ file: picked("a.png") });
    api.publishOne({ file: picked("b.png") });
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

    api.publishOne({ file: picked("a.png") });
    await flushPromises();
    getGalleryPage.mockClear();
    await flushPromises();

    expect(getGalleryPage).not.toHaveBeenCalled();
  });

  it("上传还在进行时关闭弹窗会先确认", async () => {
    uploadGalleryFile.mockReturnValue(new Promise(() => {}));
    const api = await mountGallery();
    api.publishOne({ file: picked("a.png") });
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

    api.publishOne({
      file: picked("a.png"),
      bgm: { src: "https://cdn.example.test/music/a.mp3", type: "audio" },
    });
    await flushPromises();

    const sent = uploadGalleryFile.mock.calls[0][0];
    expect(sent.get("bgmSrc")).toBe("https://cdn.example.test/music/a.mp3");
    expect(sent.get("bgmType")).toBe("audio");
  });

  it("不配背景音乐时两个字段都不出现", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1 } });
    const api = await mountGallery();

    api.publishOne({ file: picked("a.png") });
    await flushPromises();

    const sent = uploadGalleryFile.mock.calls[0][0];
    expect(sent.has("bgmSrc")).toBe(false);
    expect(sent.has("bgmType")).toBe(false);
  });
});
