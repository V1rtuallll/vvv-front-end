import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ListHeader from "@/components/ListHeader.vue";

const stubs = {
  "router-link": { props: ["to"], template: '<a :href="to"><slot /></a>' },
};

const USER = { id: 7, username: "V1rtual", avatar: "https://example.test/me.png" };

/** 挂载页头。默认：已登录，主操作是「跳到 /blog/editor」 */
function mountHeader(props = {}) {
  return mount(ListHeader, {
    props: {
      title: "Blog",
      subtitle: "Share ur opinion.",
      user: USER,
      actionLabel: "Write something",
      actionTo: "/blog/editor",
      ...props,
    },
    global: { stubs },
  });
}

describe("ListHeader", () => {
  it("渲染标题与小字说明", () => {
    expect(mountHeader().find(".list-title").text()).toBe("Blog");
    expect(mountHeader().find(".list-subtitle").text()).toBe("Share ur opinion.");
  });

  it("没有小字时不渲染那一段", () => {
    expect(mountHeader({ subtitle: "" }).find(".list-subtitle").exists()).toBe(false);
  });

  it("登录时渲染头像与 @用户名", () => {
    const header = mountHeader();

    expect(header.find(".user-avatar").attributes("src")).toBe("https://example.test/me.png");
    expect(header.find(".user-name").text()).toBe("@V1rtual");
  });

  /** 没设过头像的用户 avatar 是 NULL，兜底由渲染负责，不去改写库里的值 */
  it("没有头像时用默认头像兜底", () => {
    expect(mountHeader({ user: { ...USER, avatar: null } }).find(".user-avatar").attributes("src"))
      .toBe("/default-avatar.gif");
  });

  it("标题与小字在未登录时照样显示", () => {
    const header = mountHeader({ user: null });

    expect(header.find(".list-title").text()).toBe("Blog");
    expect(header.find(".list-subtitle").exists()).toBe(true);
  });

  /** 入口隐藏只是显示逻辑，接口自己校验权限 */
  it("未登录时右侧整块不渲染，操作入口也不出现", () => {
    const header = mountHeader({ user: null });

    expect(header.find(".header-right").exists()).toBe(false);
    expect(header.find(".list-action").exists()).toBe(false);
  });

  it("给了地址时主操作渲染成链接", () => {
    const action = mountHeader().find(".list-action");

    expect(action.element.tagName).toBe("A");
    expect(action.attributes("href")).toBe("/blog/editor");
    expect(action.text()).toBe("Write something");
  });

  it("没给地址时主操作渲染成按钮并派发 action", async () => {
    const header = mountHeader({ actionTo: "", actionLabel: "Upload" });

    const action = header.find(".list-action");
    expect(action.element.tagName).toBe("BUTTON");

    await action.trigger("click");

    expect(header.emitted("action")).toHaveLength(1);
  });
});
