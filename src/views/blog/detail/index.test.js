import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/shared/auth/owner", () => ({ isOwner: vi.fn(() => false) }));
vi.mock("@/modules/blog/api/blogApi", () => ({
  deleteBlog: vi.fn(),
  getBlogComments: vi.fn(),
  getBlogDetail: vi.fn(),
  likeBlogComment: vi.fn(),
  postBlogComment: vi.fn(),
  deleteBlogComment: vi.fn(),
}));

import {
  deleteBlog,
  getBlogComments,
  getBlogDetail,
  postBlogComment,
} from "@/modules/blog/api/blogApi";
import { useAuthStore } from "@/stores/auth";
import BlogDetailPage from "@/views/blog/detail/index.vue";

const DETAIL = {
  id: 100, title: "文章标题", content: "# 正文标题\n\n正文内容", coverImage: null,
  authorId: 9, authorUsername: "作者", views: 3, status: 1, commentCount: 1,
  createdAt: "2026-09-17T10:00:00", updatedAt: "2026-09-17T10:00:00",
};

let router;
let wrapper;

async function mountDetail(id = 100) {
  const routes = [
    { path: "/blog/detail/:id", component: BlogDetailPage },
    { path: "/blog", component: { template: "<div />" } },
  ];
  router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(`/blog/detail/${id}`);
  await router.isReady();
  wrapper = mount(BlogDetailPage, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe("Blog 详情页", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: { id: 7, username: "u7" }, token: "t", isLoggedIn: true });
    getBlogDetail.mockResolvedValue({ data: { ...DETAIL } });
    getBlogComments.mockResolvedValue({ data: [] });
    postBlogComment.mockResolvedValue({ code: 200 });
    deleteBlog.mockResolvedValue({ data: "已删除" });
    window.confirm = vi.fn(() => true);
  });

  it("渲染标题、作者、浏览数与 Markdown 正文", async () => {
    const page = await mountDetail();

    expect(page.find(".blog-detail-title").text()).toBe("文章标题");
    expect(page.find(".blog-detail-author").text()).toBe("@作者");
    expect(page.find(".blog-detail-views").text()).toContain("3");
    expect(page.find(".blog-content h1").text()).toBe("正文标题");
  });

  it("正文经同一条消毒链：脚本不会变成 DOM", async () => {
    getBlogDetail.mockResolvedValue({ data: { ...DETAIL, content: "<script>alert(1)</script>\n\n<p>正文</p>" } });

    const page = await mountDetail();

    expect(page.html()).not.toContain("alert(1)");
    expect(page.find(".blog-content p").exists()).toBe(true);
  });

  it("作者看得到编辑与删除，无关用户看不到", async () => {
    expect((await mountDetail()).find(".blog-detail-actions").exists()).toBe(false);

    useAuthStore.mockReturnValue({ user: { id: 9, username: "作者" }, token: "t", isLoggedIn: true });
    expect((await mountDetail()).find(".blog-detail-actions").exists()).toBe(true);
  });

  it("路由参数变化时重新加载", async () => {
    const page = await mountDetail();

    getBlogDetail.mockResolvedValue({ data: { ...DETAIL, id: 200, title: "第二篇" } });
    await router.push("/blog/detail/200");
    await flushPromises();

    expect(getBlogDetail).toHaveBeenLastCalledWith("200");
    expect(page.find(".blog-detail-title").text()).toBe("第二篇");
  });

  it("发表评论带着文章 id 与内容发出去，输入框清空、计数跟随服务端", async () => {
    const page = await mountDetail();
    // 请求回来会重新拉一次评论，那时列表里就有这条了
    getBlogComments.mockResolvedValue({
      data: [{
        id: 1, content: "新评论", userId: 7, username: "u7", parentId: null,
        likes: 0, isLiked: false, createdAt: "2026-09-17T12:00:00",
      }],
    });

    await page.find(".comment-input textarea").setValue("新评论");
    await page.find(".send-btn").trigger("click");
    await flushPromises();

    expect(postBlogComment).toHaveBeenCalledWith({ blogId: "100", content: "新评论" });
    expect(page.find(".comments-title").text()).toContain("1");
    expect(page.find(".comment-input textarea").element.value).toBe("");
  });

  it("删除确认后跳回列表页", async () => {
    useAuthStore.mockReturnValue({ user: { id: 9, username: "作者" }, token: "t", isLoggedIn: true });
    const page = await mountDetail();

    await page.find(".blog-detail-actions .danger").trigger("click");
    await flushPromises();

    expect(deleteBlog).toHaveBeenCalledWith(100);
    expect(router.currentRoute.value.path).toBe("/blog");
  });
});
