import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/shared/auth/owner", () => ({ isOwner: vi.fn(() => false) }));
vi.mock("@/modules/blog/api/blogApi", () => ({
  getBlogDetail: vi.fn(),
  deleteBlog: vi.fn(),
}));

import { deleteBlog, getBlogDetail } from "@/modules/blog/api/blogApi";
import { useBlogDetail } from "@/modules/blog/composables/useBlogDetail";
import { isOwner } from "@/shared/auth/owner";
import { useAuthStore } from "@/stores/auth";

const DETAIL = {
  id: 100, title: "标题", content: "# 正文", coverImage: null,
  authorId: 9, authorUsername: "作者", views: 3, status: 1, commentCount: 2,
  createdAt: "2026-09-17T10:00:00", updatedAt: "2026-09-17T10:00:00",
};

function signIn(id) {
  useAuthStore.mockReturnValue({ user: { id, username: "u" + id }, token: "t" });
}

describe("useBlogDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOwner.mockReturnValue(false);
    signIn(7);
    getBlogDetail.mockResolvedValue({ data: { ...DETAIL } });
    deleteBlog.mockResolvedValue({ data: "已删除" });
    window.confirm = vi.fn(() => true);
  });

  it("加载成功后提交文章，loading 归位", async () => {
    const api = useBlogDetail(ref(100));

    await api.load();

    expect(getBlogDetail).toHaveBeenCalledWith(100);
    expect(api.blog.value.title).toBe("标题");
    expect(api.blog.value.content).toBe("# 正文");
    expect(api.loading.value).toBe(false);
  });

  it("加载失败不提交半截数据，也不重复弹提示", async () => {
    getBlogDetail.mockRejectedValue(new Error("boom"));
    const api = useBlogDetail(ref(100));

    await api.load();

    expect(api.blog.value).toBeNull();
    expect(api.loading.value).toBe(false);
    // 提示由 request.js 负责（404 / 403 / 草稿不可见都是后端给的文案）
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  it("canManage：作者本人与 owner 为真，无关用户为假", async () => {
    const api = useBlogDetail(ref(100));
    await api.load();
    expect(api.canManage.value).toBe(false);

    signIn(9);
    const asAuthor = useBlogDetail(ref(100));
    await asAuthor.load();
    expect(asAuthor.canManage.value).toBe(true);

    signIn(7);
    isOwner.mockReturnValue(true);
    const asOwner = useBlogDetail(ref(100));
    await asOwner.load();
    expect(asOwner.canManage.value).toBe(true);
  });

  it("没确认删除时不发请求", async () => {
    window.confirm.mockReturnValue(false);
    const api = useBlogDetail(ref(100));
    await api.load();

    expect(await api.remove()).toBe(false);
    expect(deleteBlog).not.toHaveBeenCalled();
  });

  it("确认后删除成功，返回 true 并提示", async () => {
    const api = useBlogDetail(ref(100));
    await api.load();

    expect(await api.remove()).toBe(true);
    expect(deleteBlog).toHaveBeenCalledWith(100);
    expect(window.$vmessage.success).toHaveBeenCalledWith("已删除");
  });

  it("删除失败返回 false，不谎报成功", async () => {
    deleteBlog.mockRejectedValue(new Error("boom"));
    const api = useBlogDetail(ref(100));
    await api.load();

    expect(await api.remove()).toBe(false);
    expect(window.$vmessage.success).not.toHaveBeenCalled();
  });
});
