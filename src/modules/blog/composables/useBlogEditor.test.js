import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/modules/blog/api/blogApi", () => ({
  createBlog: vi.fn(),
  getBlogDetail: vi.fn(),
  updateBlog: vi.fn(),
}));

import { createBlog, getBlogDetail, updateBlog } from "@/modules/blog/api/blogApi";
import { mediaSnippet, useBlogEditor } from "@/modules/blog/composables/useBlogEditor";
import { useAuthStore } from "@/stores/auth";

const DETAIL = {
  id: 100, title: "旧标题", content: "旧正文", coverImage: "/cover.png",
  authorId: 7, authorUsername: "u7", views: 1, status: 0, commentCount: 0,
  createdAt: "2026-09-17T10:00:00", updatedAt: "2026-09-17T10:00:00",
};

describe("useBlogEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: { id: 7, username: "u7" }, token: "t", isLoggedIn: true });
    getBlogDetail.mockResolvedValue({ data: { ...DETAIL } });
    createBlog.mockResolvedValue({ data: { ...DETAIL, id: 200 } });
    updateBlog.mockResolvedValue({ data: { ...DETAIL } });
  });

  it("新建模式不请求详情，isEdit 为假", () => {
    const api = useBlogEditor(ref(""));

    expect(api.isEdit.value).toBe(false);
    expect(getBlogDetail).not.toHaveBeenCalled();
    expect(api.form.status).toBe(0);
  });

  it("编辑模式按 id 回填表单", async () => {
    const api = useBlogEditor(ref("100"));

    await api.load();

    expect(getBlogDetail).toHaveBeenCalledWith("100");
    expect(api.isEdit.value).toBe(true);
    expect(api.form.title).toBe("旧标题");
    expect(api.form.content).toBe("旧正文");
    expect(api.form.coverImage).toBe("/cover.png");
    expect(api.form.status).toBe(0);
  });

  it("标题为空时本地拦下，不发请求", async () => {
    const api = useBlogEditor(ref(""));
    api.form.content = "正文";

    const res = await api.save(1);

    expect(res).toEqual({ ok: false, id: null });
    expect(createBlog).not.toHaveBeenCalled();
    expect(window.$vmessage.warning).toHaveBeenCalledWith("标题不能为空");
  });

  it("正文为空时本地拦下，不发请求", async () => {
    const api = useBlogEditor(ref(""));
    api.form.title = "标题";

    const res = await api.save(1);

    expect(res).toEqual({ ok: false, id: null });
    expect(createBlog).not.toHaveBeenCalled();
    expect(window.$vmessage.warning).toHaveBeenCalledWith("正文不能为空");
  });

  it("发布：新建走 POST，status 为 1，返回新 id", async () => {
    const api = useBlogEditor(ref(""));
    api.form.title = "  新标题  ";
    api.form.content = "新正文";

    const res = await api.save(1);

    expect(createBlog).toHaveBeenCalledWith({ title: "新标题", content: "新正文", coverImage: "", status: 1 });
    expect(res).toEqual({ ok: true, id: 200 });
    expect(window.$vmessage.success).toHaveBeenCalledWith("已发布");
  });

  it("存草稿：status 为 0", async () => {
    const api = useBlogEditor(ref(""));
    api.form.title = "标题";
    api.form.content = "正文";

    await api.save(0);

    expect(createBlog).toHaveBeenCalledWith({ title: "标题", content: "正文", coverImage: "", status: 0 });
    expect(window.$vmessage.success).toHaveBeenCalledWith("已存为草稿");
  });

  it("编辑模式走 PATCH，带上文章 id", async () => {
    const api = useBlogEditor(ref("100"));
    await api.load();

    api.form.title = "改过的标题";
    const res = await api.save(1);

    expect(updateBlog).toHaveBeenCalledWith(100, {
      title: "改过的标题", content: "旧正文", coverImage: "/cover.png", status: 1,
    });
    expect(createBlog).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });

  it("保存失败返回 ok 为假，表单内容原样保留", async () => {
    createBlog.mockRejectedValue(new Error("boom"));
    const api = useBlogEditor(ref(""));
    api.form.title = "标题";
    api.form.content = "正文";

    const res = await api.save(1);

    expect(res).toEqual({ ok: false, id: null });
    expect(api.form.title).toBe("标题");
    expect(api.form.content).toBe("正文");
    expect(window.$vmessage.success).not.toHaveBeenCalled();
  });

  it("封面可以设置与清空", () => {
    const api = useBlogEditor(ref(""));

    api.setCover("/new.png");
    expect(api.form.coverImage).toBe("/new.png");

    api.setCover("");
    expect(api.form.coverImage).toBe("");
  });
});

describe("mediaSnippet", () => {
  it("图片用 Markdown 语法，alt 取文件名", () => {
    expect(mediaSnippet({ kind: "image", url: "https://oss.test/a.png", name: "风景.png" }))
      .toBe("![风景.png](https://oss.test/a.png)");
  });

  it("视频用原生标签（markdown-it 会原样放行）", () => {
    expect(mediaSnippet({ kind: "video", url: "https://oss.test/a.mp4", name: "a.mp4" }))
      .toBe('<video src="https://oss.test/a.mp4" controls></video>');
  });

  it("图片没有文件名时用中性占位", () => {
    expect(mediaSnippet({ kind: "image", url: "https://oss.test/a.png" }))
      .toBe("![图片](https://oss.test/a.png)");
  });
});
