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

import { useAuthStore } from "@/stores/auth";
import {
  deleteComment,
  getGalleryComments,
  getGalleryPage,
  getUploadLimit,
  postGalleryComment,
} from "@/modules/gallery/api/galleryApi";
import GalleryPage from "@/views/gallery/index.vue";

const ITEM = { id: 100, title: "月光", description: "描述", type: "photo", src: "/a.png", userId: 7, likes: 1, commentCount: 0 };

// userId 与登录用户一致：自己发的评论才看得到删除入口
const COMMENT = { id: 500, content: "一条评论", userId: 7, username: "u7", parentId: null, likes: 0, isLiked: false };

/** 打开详情弹窗：评论输入与发送都在这里面 */
async function openDetail() {
  const wrapper = mount(GalleryPage);
  await flushPromises();
  await wrapper.find(".gallery-card").trigger("click");
  await flushPromises();
  return wrapper;
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
