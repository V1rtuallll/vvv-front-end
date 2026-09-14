import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/about/api/aboutApi", () => ({ getAbout: vi.fn() }));
vi.mock("@/modules/admin/api/adminApi", () => ({ saveAdminAbout: vi.fn() }));

import { saveAdminAbout } from "@/modules/admin/api/adminApi";
import { getAbout } from "@/modules/about/api/aboutApi";
import AboutConfigForm from "@/views/admin/components/AboutConfigForm.vue";

function payload(overrides = {}) {
  return {
    data: {
      avatarSrc: "",
      displayName: "",
      tagline: "",
      bioHtml: "",
      links: [],
      tags: [],
      ...overrides,
    },
  };
}

async function mountForm(overrides) {
  getAbout.mockResolvedValue(payload(overrides));
  const wrapper = mount(AboutConfigForm);
  await flushPromises();
  return wrapper;
}

describe("AboutConfigForm", () => {
  beforeEach(() => {
    getAbout.mockResolvedValue(payload());
    saveAdminAbout.mockResolvedValue({ code: 200 });
  });

  it("回显已有内容，且不再渲染头像与昵称输入", async () => {
    const wrapper = await mountForm({ displayName: "V1rtual", tagline: "签名", bioHtml: "<p>正文</p>" });

    // 身份来自站点账号，表单不再让作者编辑这两项
    expect(wrapper.find(".about-avatar-input").exists()).toBe(false);
    expect(wrapper.find(".about-name-input").exists()).toBe(false);
    expect(wrapper.find(".about-tagline-input").element.value).toBe("签名");
    expect(wrapper.find(".about-bio-input").element.value).toBe("<p>正文</p>");
  });

  it("保存载荷不再带身份字段", async () => {
    const wrapper = await mountForm({ avatarSrc: "/avatar.gif", displayName: "V1rtual" });

    await wrapper.find(".about-save").trigger("click");
    await flushPromises();

    const sent = saveAdminAbout.mock.calls[0][0];
    expect(sent).not.toHaveProperty("avatarSrc");
    expect(sent).not.toHaveProperty("displayName");
  });

  it("正文预览实时反映输入", async () => {
    const wrapper = await mountForm();

    await wrapper.find(".about-bio-input").setValue("<p>新的正文</p>");

    expect(wrapper.find(".bio-preview .about-bio p").text()).toBe("新的正文");
  });

  it("预览是整页，身份区出现在预览里", async () => {
    const wrapper = await mountForm({ avatarSrc: "/avatar.gif", displayName: "V1rtual" });

    expect(wrapper.find(".bio-preview .about-identity").exists()).toBe(true);
    expect(wrapper.find(".bio-preview .about-avatar").attributes("src")).toBe("/avatar.gif");
    expect(wrapper.find(".bio-preview .about-name").text()).toBe("V1rtual");
  });

  it("预览里的签名、标签与链接跟着表单实时变化", async () => {
    const wrapper = await mountForm({ links: [{ name: "GitHub", url: "/gh" }] });

    await wrapper.find(".about-tagline-input").setValue("新的签名");
    await wrapper.find(".about-tags-input").setValue("Vue, Java");
    await wrapper.find(".link-name").setValue("GitLab");

    expect(wrapper.find(".bio-preview .about-tagline").text()).toBe("新的签名");
    expect(wrapper.findAll(".bio-preview .about-tag").map((tag) => tag.text())).toEqual(["Vue", "Java"]);
    expect(wrapper.find(".bio-preview .about-link").text()).toContain("GitLab");
  });

  it("预览也走过滤，脚本渲染不出来", async () => {
    const wrapper = await mountForm();

    await wrapper.find(".about-bio-input").setValue("<script>alert(1)</script><p>正文</p>");

    expect(wrapper.find(".bio-preview").html()).not.toContain("alert");
    expect(wrapper.find(".bio-preview .about-bio p").text()).toBe("正文");
  });

  it("标签用逗号分隔，中英文逗号都认", async () => {
    const wrapper = await mountForm({ tags: ["Vue", "Java"] });

    expect(wrapper.find(".about-tags-input").element.value).toBe("Vue, Java");

    await wrapper.find(".about-tags-input").setValue("Vue，Java, 摄影");
    await wrapper.find(".about-save").trigger("click");
    await flushPromises();

    expect(saveAdminAbout.mock.calls[0][0].tags).toEqual(["Vue", "Java", "摄影"]);
  });

  it("可以上下移动链接", async () => {
    const wrapper = await mountForm({ links: [{ name: "A", url: "/a" }, { name: "B", url: "/b" }] });

    await wrapper.findAll(".about-link-down")[0].trigger("click");
    await wrapper.find(".about-save").trigger("click");
    await flushPromises();

    expect(saveAdminAbout.mock.calls[0][0].links.map((link) => link.name)).toEqual(["B", "A"]);
  });

  it("可以添加与删除链接", async () => {
    const wrapper = await mountForm({ links: [{ name: "A", url: "/a" }] });

    await wrapper.find(".about-link-add").trigger("click");
    expect(wrapper.findAll(".link-item")).toHaveLength(2);

    // 删掉刚加的那条空行，剩下的仍是原来那条
    await wrapper.findAll(".about-link-remove")[1].trigger("click");
    expect(wrapper.findAll(".link-item")).toHaveLength(1);

    await wrapper.find(".about-save").trigger("click");
    await flushPromises();

    expect(saveAdminAbout.mock.calls[0][0].links).toEqual([{ name: "A", url: "/a", icon: "" }]);
  });

  it("保存时丢掉名称和地址都为空的条目", async () => {
    const wrapper = await mountForm({ links: [{ name: "GitHub", url: "/gh" }, { name: "", url: "" }] });

    await wrapper.find(".about-save").trigger("click");
    await flushPromises();

    expect(saveAdminAbout.mock.calls[0][0].links).toEqual([{ name: "GitHub", url: "/gh", icon: "" }]);
  });

  it("预览不渲染保存时会被丢掉的空链接行", async () => {
    const wrapper = await mountForm({ links: [{ name: "A", url: "/a" }] });

    await wrapper.find(".about-link-add").trigger("click");

    expect(wrapper.findAll(".link-item")).toHaveLength(2);
    expect(wrapper.findAll(".bio-preview .about-link")).toHaveLength(1);
  });

  it("链接行可以填图标 URL，并随保存提交", async () => {
    const wrapper = await mountForm({ links: [{ name: "GitHub", url: "/gh" }] });

    expect(wrapper.find(".about-link-icon-input").exists()).toBe(true);

    await wrapper.find(".about-link-icon-input").setValue("/icons/gh.gif");
    await wrapper.find(".about-save").trigger("click");
    await flushPromises();

    expect(saveAdminAbout.mock.calls[0][0].links).toEqual([
      { name: "GitHub", url: "/gh", icon: "/icons/gh.gif" },
    ]);
  });

  it("首项的上升按钮与末项的下降按钮不可用", async () => {
    const wrapper = await mountForm({ links: [{ name: "A", url: "/a" }, { name: "B", url: "/b" }] });

    const ups = wrapper.findAll(".about-link-up");
    const downs = wrapper.findAll(".about-link-down");

    expect(ups[0].attributes("disabled")).toBeDefined();
    expect(downs[1].attributes("disabled")).toBeDefined();
    expect(ups[1].attributes("disabled")).toBeUndefined();
    expect(downs[0].attributes("disabled")).toBeUndefined();
  });

  it("提示里列出放行的标签，与实际白名单同源", async () => {
    const wrapper = await mountForm();

    const hint = wrapper.find(".field-hint").text();
    expect(hint).toContain("blockquote");
    expect(hint).toContain("table");
  });

  it("加载成功时保存按钮可用", async () => {
    const wrapper = await mountForm();

    expect(wrapper.find(".about-save").attributes("disabled")).toBeUndefined();
  });

  it("加载失败时保存按钮不可用，避免用空值覆盖库里内容", async () => {
    getAbout.mockRejectedValue(new Error("boom"));

    const wrapper = mount(AboutConfigForm);
    await flushPromises();

    expect(wrapper.find(".about-save").attributes("disabled")).toBeDefined();

    await wrapper.find(".about-save").trigger("click");
    expect(saveAdminAbout).not.toHaveBeenCalled();
  });

  it("链接条目缺字段时也能提交，不会在点击处理里抛错", async () => {
    const wrapper = await mountForm({ links: [{ url: "https://x" }] });

    await wrapper.find(".about-save").trigger("click");
    await flushPromises();

    expect(saveAdminAbout).toHaveBeenCalledWith(
      expect.objectContaining({ links: [{ name: "", url: "https://x", icon: "" }] }),
    );
  });

  it("签名输入按后端列宽限制长度", async () => {
    const wrapper = await mountForm();

    expect(wrapper.find(".about-tagline-input").attributes("maxlength")).toBe("255");
  });
});
