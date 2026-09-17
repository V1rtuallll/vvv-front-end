import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/shared/auth/owner", () => ({ isOwner: vi.fn(() => false) }));
vi.mock("@/modules/blog/api/blogApi", () => ({
  getBlogComments: vi.fn(),
  postBlogComment: vi.fn(),
  likeBlogComment: vi.fn(),
  deleteBlogComment: vi.fn(),
}));

import {
  deleteBlogComment,
  getBlogComments,
  likeBlogComment,
  postBlogComment,
} from "@/modules/blog/api/blogApi";
import { useBlogComments } from "@/modules/blog/composables/useBlogComments";
import { isOwner } from "@/shared/auth/owner";
import { useAuthStore } from "@/stores/auth";

const ME = 7;
const AUTHOR = 9;
const OTHER = 8;
const BLOG_ID = 100;

const TOP = {
  id: 1, content: "顶层", userId: OTHER, username: "甲", parentId: null,
  likes: 0, isLiked: false, createdAt: "2026-09-17T10:00:00",
};
const REPLY = {
  id: 2, content: "回复", userId: ME, username: "乙", parentId: 1,
  likes: 0, isLiked: false, createdAt: "2026-09-17T11:00:00",
};
const NESTED = {
  id: 3, content: "回复的回复", userId: OTHER, username: "甲", parentId: 2,
  likes: 0, isLiked: false, createdAt: "2026-09-17T12:00:00",
};

function signIn(id) {
  useAuthStore.mockReturnValue({ user: { id, username: "u" + id }, token: "t" });
}

/** composable 里没有 onMounted，直接调用即可（详情页由页面自己驱动加载） */
function makeComments({ blogId = BLOG_ID, authorId = AUTHOR } = {}) {
  return useBlogComments(ref(blogId), ref(authorId));
}

describe("useBlogComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOwner.mockReturnValue(false);
    signIn(ME);
    getBlogComments.mockResolvedValue({ data: [{ ...TOP }] });
    postBlogComment.mockResolvedValue({ code: 200 });
    likeBlogComment.mockResolvedValue({ code: 200 });
    deleteBlogComment.mockResolvedValue({ code: 200 });
  });

  it("加载评论后按父子关系排成两层", async () => {
    getBlogComments.mockResolvedValue({ data: [{ ...TOP }, { ...REPLY }] });
    const api = makeComments();

    await api.loadComments();

    expect(getBlogComments).toHaveBeenCalledWith(BLOG_ID);
    expect(api.threads.value).toHaveLength(1);
    expect(api.threads.value[0].id).toBe(1);
    expect(api.threads.value[0].replies.map((reply) => reply.id)).toEqual([2]);
  });

  it("「回复的回复」挂到根评论下，并用 replyToName 标出直接回复对象", async () => {
    getBlogComments.mockResolvedValue({ data: [{ ...TOP }, { ...REPLY }, { ...NESTED }] });
    const api = makeComments();

    await api.loadComments();

    const root = api.threads.value[0];
    expect(root.replies.map((reply) => reply.id)).toEqual([2, 3]);
    expect(root.replies[1].replyToName).toBe("乙");
  });

  it("父评论不在列表里的评论按顶层展示，内容不丢", async () => {
    getBlogComments.mockResolvedValue({ data: [{ ...REPLY }] });
    const api = makeComments();

    await api.loadComments();

    expect(api.threads.value).toHaveLength(1);
    expect(api.threads.value[0].id).toBe(2);
  });

  it("发顶层评论不带 parentId", async () => {
    const api = makeComments();
    api.newComment.value = "  写得真好  ";

    const ok = await api.postComment();

    expect(ok).toBe(true);
    expect(postBlogComment).toHaveBeenCalledWith({ blogId: BLOG_ID, content: "写得真好" });
    expect(api.newComment.value).toBe("");
  });

  it("回复带上 parentId，并把所在线程展开", async () => {
    getBlogComments.mockResolvedValue({ data: [{ ...TOP }, { ...REPLY }] });
    const api = makeComments();
    await api.loadComments();

    api.startReply(api.threads.value[0].replies[0]);
    api.newComment.value = "回一句";

    const ok = await api.postComment();

    expect(ok).toBe(true);
    expect(postBlogComment).toHaveBeenCalledWith({ blogId: BLOG_ID, content: "回一句", parentId: 2 });
    expect(api.replyTarget.value).toBeNull();
    expect(api.isThreadExpanded(1)).toBe(true);
  });

  it("发送失败保留输入与回复对象，可以直接重发", async () => {
    postBlogComment.mockRejectedValue(new Error("boom"));
    const api = makeComments();
    api.startReply(TOP);
    api.newComment.value = "重发用";

    const ok = await api.postComment();

    expect(ok).toBe(false);
    expect(api.newComment.value).toBe("重发用");
    expect(api.replyTarget.value).toEqual({ id: 1, username: "甲" });
    // 提示由 request.js 负责
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  it("已赞过的评论在本地拦住，不再打请求", async () => {
    const api = makeComments();

    const ok = await api.likeComment({ id: 5, isLiked: true });

    expect(ok).toBe(false);
    expect(likeBlogComment).not.toHaveBeenCalled();
    expect(window.$vmessage.info).toHaveBeenCalledWith("不能重复点赞");
  });

  it("点赞成功后重新拉一次评论，计数以服务端为准", async () => {
    const api = makeComments();
    getBlogComments.mockClear();

    const ok = await api.likeComment({ id: 5, isLiked: false });

    expect(ok).toBe(true);
    expect(likeBlogComment).toHaveBeenCalledWith(5);
    expect(getBlogComments).toHaveBeenCalledWith(BLOG_ID);
  });

  it("点赞失败不谎报成功", async () => {
    likeBlogComment.mockRejectedValue(new Error("boom"));
    const api = makeComments();

    expect(await api.likeComment({ id: 5, isLiked: false })).toBe(false);
  });

  it("删评论把整棵回复树一起移除，并返回删除条数", async () => {
    getBlogComments.mockResolvedValue({ data: [{ ...TOP }, { ...REPLY }, { ...NESTED }] });
    const api = makeComments();
    await api.loadComments();

    const removed = await api.removeComment(api.threads.value[0]);

    expect(deleteBlogComment).toHaveBeenCalledWith(1);
    expect(removed).toBe(3);
    expect(api.comments.value).toEqual([]);
    expect(window.$vmessage.success).toHaveBeenCalledWith("删除成功");
  });

  it("删除失败返回 0，不谎报成功", async () => {
    deleteBlogComment.mockRejectedValue(new Error("boom"));
    const api = makeComments();
    await api.loadComments();

    const removed = await api.removeComment({ id: 1 });

    expect(removed).toBe(0);
    expect(api.comments.value).toHaveLength(1);
    expect(window.$vmessage.success).not.toHaveBeenCalled();
  });

  it("删评论入口：评论作者、文章作者、owner 三者之一可见", async () => {
    const api = makeComments();
    expect(api.canManageComment({ userId: ME })).toBe(true);
    expect(api.canManageComment({ userId: OTHER })).toBe(false);

    // 文章作者：与自己是不是评论作者无关
    signIn(AUTHOR);
    expect(makeComments().canManageComment({ userId: OTHER })).toBe(true);

    // owner：谁的文章、谁的评论都能删
    signIn(OTHER);
    isOwner.mockReturnValue(true);
    expect(makeComments().canManageComment({ userId: ME })).toBe(true);
  });
});
