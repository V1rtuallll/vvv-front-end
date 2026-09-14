import { describe, expect, it } from "vitest";

import { brandIconFor } from "@/views/about/brandIcons";

describe("brandIconFor", () => {
  it("裸域名命中对应图标", () => {
    expect(brandIconFor("https://github.com/V1rtual")).toBe("/icons/github.svg");
    expect(brandIconFor("https://www.zhihu.com/people/x")).toBe("/icons/zhihu.svg");
    expect(brandIconFor("https://b23.tv/abc")).toBe("/icons/bilibili.svg");
  });

  it("带 www 前缀的主机照样命中", () => {
    expect(brandIconFor("https://www.github.com/V1rtual")).toBe("/icons/github.svg");
    expect(brandIconFor("http://www.weibo.com/u/1")).toBe("/icons/weibo.svg");
  });

  it("任意层级子域名照样命中", () => {
    expect(brandIconFor("https://gist.github.com/x")).toBe("/icons/github.svg");
    expect(brandIconFor("https://store.steampowered.com/app/1")).toBe("/icons/steam.svg");
    expect(brandIconFor("https://music.163.com/#/user/home?id=1"))
      .toBe("/icons/neteasecloudmusic.svg");
  });

  it("拼接出来的相似域名不命中", () => {
    expect(brandIconFor("https://github.com.evil.com/x")).toBe("");
    expect(brandIconFor("https://notgithub.com/x")).toBe("");
  });

  it("mailto 归到邮件图标", () => {
    expect(brandIconFor("mailto:v1rtual@example.com")).toBe("/icons/mail.svg");
  });

  it("站内相对路径不猜测，返回空串", () => {
    expect(brandIconFor("/gallery")).toBe("");
    expect(brandIconFor("./about")).toBe("");
  });

  it("未知主机返回空串", () => {
    expect(brandIconFor("https://example.com/x")).toBe("");
  });

  it("非 http 协议返回空串", () => {
    expect(brandIconFor("ftp://github.com/x")).toBe("");
    expect(brandIconFor("javascript:alert(1)")).toBe("");
  });

  it("空值与非法输入返回空串", () => {
    expect(brandIconFor("")).toBe("");
    expect(brandIconFor("   ")).toBe("");
    expect(brandIconFor("github.com/V1rtual")).toBe("");
    expect(brandIconFor(undefined)).toBe("");
  });
});
