import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/blog/api/blogApi", () => ({ uploadBlogMedia: vi.fn() }));

import { uploadBlogMedia } from "@/modules/blog/api/blogApi";
import BlogMediaPicker from "@/views/blog/components/BlogMediaPicker.vue";

const imageFile = () => new File(["x"], "风景.png", { type: "image/png" });
const videoFile = () => new File(["x"], "片段.mp4", { type: "video/mp4" });

async function pick(wrapper, file) {
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, "files", { value: [file], writable: false });
  await input.trigger("change");
}

describe("BlogMediaPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadBlogMedia.mockResolvedValue({ data: "https://oss.test/a.bin" });
  });

  it("选图片后上传，把地址、类型与文件名交出去", async () => {
    const wrapper = mount(BlogMediaPicker);

    await pick(wrapper, imageFile());
    await flushPromises();

    const formData = uploadBlogMedia.mock.calls[0][0];
    expect(formData.get("file")).toBeInstanceOf(File);
    expect(formData.get("file").name).toBe("风景.png");
    expect(wrapper.emitted("picked")[0]).toEqual([
      { kind: "image", url: "https://oss.test/a.bin", name: "风景.png" },
    ]);
  });

  it("选视频时类型是 video", async () => {
    const wrapper = mount(BlogMediaPicker);

    await pick(wrapper, videoFile());
    await flushPromises();

    expect(wrapper.emitted("picked")[0][0].kind).toBe("video");
  });

  it("上传中按钮禁用并显示进度", async () => {
    let resolveUpload;
    uploadBlogMedia.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve; }));
    const wrapper = mount(BlogMediaPicker);

    await pick(wrapper, imageFile());

    expect(wrapper.find(".picker-btn").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".picker-btn").text()).toContain("上传中");

    resolveUpload({ data: "https://oss.test/a.png" });
    await flushPromises();

    expect(wrapper.find(".picker-btn").attributes("disabled")).toBeUndefined();
  });

  it("上传失败不交出地址，也不重复弹提示", async () => {
    uploadBlogMedia.mockRejectedValue(new Error("boom"));
    const wrapper = mount(BlogMediaPicker);

    await pick(wrapper, imageFile());
    await flushPromises();

    expect(wrapper.emitted("picked")).toBeUndefined();
    // 提示由 request.js 负责（含后端返回的「博客仅支持图片、GIF 和视频」）
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });
});
