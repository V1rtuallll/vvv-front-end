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

  it("回显已有内容", async () => {
    const wrapper = await mountForm({ displayName: "V1rtual", tagline: "签名", bioHtml: "<p>正文</p>" });

    expect(wrapper.find(".about-name-input").element.value).toBe("V1rtual");
    expect(wrapper.find(".about-tagline-input").element.value).toBe("签名");
    expect(wrapper.find(".about-bio-input").element.value).toBe("<p>正文</p>");
  });

  it("正文预览实时反映输入", async () => {
    const wrapper = await mountForm();

    await wrapper.find(".about-bio-input").setValue("<p>新的正文</p>");

    expect(wrapper.find(".bio-preview .about-bio p").text()).toBe("新的正文");
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

    expect(saveAdminAbout.mock.calls[0][0].links).toEqual([{ name: "A", url: "/a" }]);
  });

  it("保存时丢掉名称和地址都为空的条目", async () => {
    const wrapper = await mountForm({ links: [{ name: "GitHub", url: "/gh" }, { name: "", url: "" }] });

    await wrapper.find(".about-save").trigger("click");
    await flushPromises();

    expect(saveAdminAbout.mock.calls[0][0].links).toEqual([{ name: "GitHub", url: "/gh" }]);
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
});
