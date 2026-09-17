import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/modules/blog/api/blogApi", () => ({
  createBlog: vi.fn(),
  getBlogDetail: vi.fn(),
  updateBlog: vi.fn(),
  uploadBlogMedia: vi.fn(),
}));

import { createBlog, getBlogDetail, updateBlog, uploadBlogMedia } from "@/modules/blog/api/blogApi";
import { useAuthStore } from "@/stores/auth";
import BlogEditorPage from "@/views/blog/editor/index.vue";

const DETAIL = {
  id: 100, title: "旧标题", content: "旧正文", coverImage: "",
  authorId: 7, authorUsername: "u7", views: 1, status: 0, commentCount: 0,
  createdAt: "2026-09-17T10:00:00", updatedAt: "2026-09-17T10:00:00",
};

let router;
let wrapper;

async function mountEditor(query = "") {
  const routes = [
    { path: "/blog/editor", component: BlogEditorPage },
    { path: "/blog/detail/:id", component: { template: "<div />" } },
  ];
  router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(`/blog/editor${query}`);
  await router.isReady();
  wrapper = mount(BlogEditorPage, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe("Blog 编辑器", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: { id: 7, username: "u7" }, token: "t", isLoggedIn: true });
    getBlogDetail.mockResolvedValue({ data: { ...DETAIL } });
    createBlog.mockResolvedValue({ data: { ...DETAIL, id: 200 } });
    updateBlog.mockResolvedValue({ data: { ...DETAIL } });
    uploadBlogMedia.mockResolvedValue({ data: "https://oss.test/a.png" });
  });

  it("新建模式不请求详情，预览跟着输入实时变化", async () => {
    const page = await mountEditor();

    expect(getBlogDetail).not.toHaveBeenCalled();

    await page.find(".editor-title-input").setValue("标题");
    await page.find(".editor-content-input").setValue("## 小标题");

    expect(page.find(".preview-pane .blog-content h2").text()).toBe("小标题");
  });

  it("发布成功后跳到详情页", async () => {
    const page = await mountEditor();
    await page.find(".editor-title-input").setValue("标题");
    await page.find(".editor-content-input").setValue("正文");

    await page.find(".editor-publish").trigger("click");
    await flushPromises();

    expect(createBlog).toHaveBeenCalledWith({ title: "标题", content: "正文", coverImage: "", status: 1 });
    expect(router.currentRoute.value.path).toBe("/blog/detail/200");
  });

  it("存草稿把 status 传 0", async () => {
    const page = await mountEditor();
    await page.find(".editor-title-input").setValue("标题");
    await page.find(".editor-content-input").setValue("正文");

    await page.find(".editor-draft").trigger("click");
    await flushPromises();

    expect(createBlog).toHaveBeenCalledWith({ title: "标题", content: "正文", coverImage: "", status: 0 });
  });

  it("带 ?id= 时回填表单，保存走更新", async () => {
    const page = await mountEditor("?id=100");

    expect(getBlogDetail).toHaveBeenCalledWith("100");
    expect(page.find(".editor-title-input").element.value).toBe("旧标题");

    await page.find(".editor-publish").trigger("click");
    await flushPromises();

    expect(updateBlog).toHaveBeenCalledWith(100, expect.objectContaining({ title: "旧标题", status: 1 }));
  });

  it("加载失败时显示错误文案并禁用两个保存按钮", async () => {
    getBlogDetail.mockRejectedValue(new Error("boom"));

    const page = await mountEditor("?id=100");

    expect(page.find(".editor-load-error").text()).toBe("文章加载失败，无法编辑。");
    expect(page.find(".editor-draft").attributes("disabled")).toBeDefined();
    expect(page.find(".editor-publish").attributes("disabled")).toBeDefined();
  });

  it("插入图片把 Markdown 片段插到光标处", async () => {
    const page = await mountEditor();
    const textarea = page.find(".editor-content-input");
    await textarea.setValue("前后");
    textarea.element.selectionStart = 1;
    textarea.element.selectionEnd = 1;

    const picker = page.findAllComponents({ name: "BlogMediaPicker" })[0];
    picker.vm.$emit("picked", { kind: "image", url: "https://oss.test/a.png", name: "风景.png" });
    await flushPromises();

    expect(page.find(".editor-content-input").element.value)
      .toBe("前![风景.png](https://oss.test/a.png)后");
  });

  it("上传封面把地址写进表单并显示预览", async () => {
    const page = await mountEditor();

    const picker = page.findAllComponents({ name: "BlogMediaPicker" })[1];
    picker.vm.$emit("picked", { kind: "image", url: "https://oss.test/cover.png", name: "封面.png" });
    await flushPromises();

    expect(page.find(".cover-image").attributes("src")).toBe("https://oss.test/cover.png");

    await page.find(".cover-clear").trigger("click");
    expect(page.find(".cover-image").exists()).toBe(false);
  });
});
