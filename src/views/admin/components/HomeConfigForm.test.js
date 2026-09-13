import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import HomeConfigForm from "@/views/admin/components/HomeConfigForm.vue";

const BASE = "https://vvv-v1rtual.oss-cn-beijing.aliyuncs.com";

function config(overrides = {}) {
  return {
    main: { type: "video", src: "", title: "标题", desc: "描述", alt: "", random: 1 },
    ...overrides,
  };
}

function mountForm(files, mainOverrides = {}) {
  return mount(HomeConfigForm, {
    props: {
      config: config({ main: { ...config().main, ...mainOverrides } }),
      availableFiles: files,
    },
  });
}

describe("HomeConfigForm 的随机源列表", () => {
  it("视频显示 video 预览，且不需要点开才能看到", () => {
    const wrapper = mountForm([`${BASE}/video/a.mp4`]);

    expect(wrapper.find(".file-preview video").exists()).toBe(true);
    expect(wrapper.find(".file-preview img").exists()).toBe(false);
  });

  it("图片与 GIF 显示 img 预览", () => {
    for (const name of ["a.jpg", "b.jpeg", "c.png", "d.webp", "e.bmp", "f.gif"]) {
      const wrapper = mountForm([`${BASE}/imgs/${name}`]);
      expect(wrapper.find(".file-preview img").exists(), name).toBe(true);
    }
  });

  it("音频显示 audio 预览", () => {
    const wrapper = mountForm([`${BASE}/music/a.mp3`]);

    expect(wrapper.find(".file-preview audio").exists()).toBe(true);
  });

  it("认不出扩展名时明确显示无预览，而不是塞一个坏掉的元素", () => {
    const wrapper = mountForm([`${BASE}/misc/readme.txt`]);

    expect(wrapper.find(".preview-none").exists()).toBe(true);
    expect(wrapper.find(".file-preview img").exists()).toBe(false);
    expect(wrapper.find(".file-preview video").exists()).toBe(false);
  });

  it("带查询串的 URL 也能认出类型", () => {
    const wrapper = mountForm([`${BASE}/video/a.mp4?x-oss-process=style/thumb`]);

    expect(wrapper.find(".file-preview video").exists()).toBe(true);
  });

  it("列表显示文件名而不是整条 URL，完整地址留在 title 与 href 上", () => {
    const url = `${BASE}/video/9f3c1a2b-4d5e-6f70-8192-a3b4c5d6e7f8.mp4`;
    const wrapper = mountForm([url]);

    const link = wrapper.find(".file-link");
    expect(link.text()).toBe("9f3c1a2b-4d5e-6f70-8192-a3b4c5d6e7f8.mp4");
    expect(link.text()).not.toContain("aliyuncs.com");
    expect(link.attributes("href")).toBe(url);
    expect(link.attributes("title")).toBe(url);
  });

  it("点「设为主展示」把对应的 URL 抛给父组件", async () => {
    const url = `${BASE}/video/a.mp4`;
    const wrapper = mountForm([url]);

    await wrapper.find(".file-item .crt-mini-btn").trigger("click");

    expect(wrapper.emitted("set-main")).toEqual([[url]]);
  });

  it("列出数量，方便判断随机源有多少条", () => {
    const wrapper = mountForm([`${BASE}/video/a.mp4`, `${BASE}/video/b.mp4`]);

    expect(wrapper.text()).toContain("2 条");
  });

  it("勾了随机时不显示「指定 URL」输入框", () => {
    expect(mountForm([], { random: 1 }).find("input[placeholder='https://...']").exists()).toBe(false);
    expect(mountForm([], { random: 0 }).find("input[placeholder='https://...']").exists()).toBe(true);
  });

  it("点保存时把事件抛给父组件", async () => {
    const wrapper = mountForm([]);

    await wrapper.find(".crt-btn").trigger("click");

    expect(wrapper.emitted("save")).toHaveLength(1);
  });
});
