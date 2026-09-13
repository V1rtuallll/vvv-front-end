import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/shared/auth/owner", () => ({ isOwner: vi.fn(() => false) }));
vi.mock("@/modules/user/api/userApi", () => ({ getPublicUser: vi.fn() }));
vi.mock("@/modules/gallery/api/galleryApi", () => ({
  getGalleryComments: vi.fn(),
  getGalleryPage: vi.fn(),
  getUploadLimit: vi.fn(),
  isGalleryLiked: vi.fn(),
  likeGallery: vi.fn(),
  likeGalleryComment: vi.fn(),
  postGalleryComment: vi.fn(),
  uploadGalleryFile: vi.fn(),
  updateGallery: vi.fn(),
  deleteGallery: vi.fn(),
  deleteComment: vi.fn(),
}));

import { isOwner } from "@/shared/auth/owner";
import { useAuthStore } from "@/stores/auth";
import {
  deleteComment,
  deleteGallery,
  getGalleryComments,
  getGalleryPage,
  getUploadLimit,
  uploadGalleryFile,
  updateGallery,
} from "@/modules/gallery/api/galleryApi";
import { useGalleryPage } from "@/modules/gallery/composables/useGalleryPage";

const ME = 7;
const SOMEONE_ELSE = 8;
const ITEM = { id: 100, title: "旧标题", description: "旧描述", userId: ME, commentCount: 2 };

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
    await api.submitEdit({ title: "新标题" });

    expect(updateGallery).toHaveBeenCalledWith(100, { title: "新标题" });
    expect(api.galleryList.value[0].title).toBe("新标题");
    expect(api.currentItem.value.title).toBe("新标题");
    expect(getGalleryPage).not.toHaveBeenCalled();
    expect(api.editingItem.value).toBeNull();
  });

  it("编辑成功后弹一次成功提示（错误提示归 request.js 管）", async () => {
    updateGallery.mockResolvedValue({ data: {} });
    const api = await mountGallery();
    api.openEditModal(api.galleryList.value[0]);

    await api.submitEdit({ title: "新标题" });

    expect(window.$vmessage.success).toHaveBeenCalledTimes(1);
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  it("编辑失败时不改动已展示的数据，也不重复弹错误", async () => {
    updateGallery.mockRejectedValue(new Error("boom"));
    const api = await mountGallery();
    api.openEditModal(api.galleryList.value[0]);

    await api.submitEdit({ title: "新标题" });

    expect(api.galleryList.value[0].title).toBe("旧标题");
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  it("标题清空属于本地校验，直接拦下不发请求", async () => {
    const api = await mountGallery();
    api.openEditModal(api.galleryList.value[0]);

    await api.submitEdit({ title: "  " });

    expect(updateGallery).not.toHaveBeenCalled();
    expect(window.$vmessage.warning).toHaveBeenCalled();
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
});

describe("useGalleryPage 的上传队列", () => {
  function selectFiles(...names) {
    const files = names.map((name) => ({ name, size: 10, type: "image/png" }));
    return { target: { files, value: "x" } };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    isOwner.mockReturnValue(false);
    signIn(ME);
    getGalleryPage.mockResolvedValue({ data: { list: [], total: 0 } });
    getUploadLimit.mockResolvedValue({ data: { maxFileSizeBytes: 5 * 1024 * 1024 } });
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("分几次挑文件是追加而不是替换", async () => {
    const api = await mountGallery();

    api.handleFiles(selectFiles("a.png"));
    api.handleFiles(selectFiles("b.png", "c.png"));

    expect(api.uploadItems.value.map((item) => item.name)).toEqual(["a.png", "b.png", "c.png"]);
  });

  it("每个文件的标题默认取去掉扩展名的文件名", async () => {
    const api = await mountGallery();

    api.handleFiles(selectFiles("月光.png"));

    expect(api.uploadItems.value[0].title).toBe("月光");
  });

  it("大小上限提示来自后端配置，前端不写死", async () => {
    getUploadLimit.mockResolvedValue({ data: { maxFileSizeBytes: 20 * 1024 * 1024 } });
    const api = await mountGallery();

    api.openUploadModal();
    await flushPromises();

    expect(getUploadLimit).toHaveBeenCalled();
    expect(api.uploadLimitText.value).toBe("单个文件最大 20 MB");
  });

  it("确认上传会启动队列并逐文件发起请求", async () => {
    uploadGalleryFile.mockResolvedValue({ data: { id: 1, status: "success" } });
    const api = await mountGallery();
    api.handleFiles(selectFiles("a.png", "b.png"));

    api.uploadAll();
    await flushPromises();

    expect(uploadGalleryFile).toHaveBeenCalledTimes(2);
  });

  it("还有文件在上传时关闭弹窗会先确认", async () => {
    uploadGalleryFile.mockReturnValue(new Promise(() => {}));
    const api = await mountGallery();
    api.openUploadModal();
    api.handleFiles(selectFiles("a.png"));
    api.uploadAll();
    await flushPromises();

    window.confirm = vi.fn(() => false);
    api.closeUploadModal();

    expect(window.confirm).toHaveBeenCalled();
    expect(api.showUploadModal.value).toBe(true);
  });

  it("没有未完成的上传时直接关闭，不打扰用户", async () => {
    const api = await mountGallery();
    api.openUploadModal();
    window.confirm = vi.fn(() => true);

    api.closeUploadModal();

    expect(window.confirm).not.toHaveBeenCalled();
    expect(api.showUploadModal.value).toBe(false);
  });
});
