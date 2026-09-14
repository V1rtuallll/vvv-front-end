import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "@/utils/sanitizeHtml";

describe("sanitizeHtml 的危险内容处理", () => {
  it("删除 script 标签连同它的内容", () => {
    const out = sanitizeHtml("<script>alert(1)</script><p>正文</p>");

    expect(out).toBe("<p>正文</p>");
    expect(out).not.toContain("alert");
  });

  it("script 写在正文后面也被删掉", () => {
    const out = sanitizeHtml("<p>正文</p><script>alert(1)</script>");

    expect(out).toContain("<p>正文</p>");
    expect(out).not.toContain("alert");
  });

  it("删除 style 标签连同它的内容，避免贴的样式串到整站", () => {
    const out = sanitizeHtml("<style>.vf-nav{display:none}</style><p>正文</p>");

    expect(out).toBe("<p>正文</p>");
    expect(out).not.toContain("vf-nav");
  });

  it("删除内联事件属性", () => {
    const out = sanitizeHtml('<img src="/a.png" onerror="window.__pwned=1">');

    expect(out).not.toContain("onerror");
    expect(out).toContain("/a.png");
    expect(window.__pwned).toBeUndefined();
  });

  it("删除 a 上的内联事件属性", () => {
    const out = sanitizeHtml('<a href="/x" onclick="alert(1)">链接</a>');

    expect(out).not.toContain("onclick");
    expect(out).toContain("链接");
  });

  it("删除 iframe / form / svg 这类不在白名单里的结构", () => {
    expect(sanitizeHtml('<iframe src="https://evil.test"></iframe>')).not.toContain("iframe");
    expect(sanitizeHtml('<form action="/x"><input name="p"></form>')).not.toContain("input");
    expect(sanitizeHtml("<svg><circle /></svg>")).not.toContain("svg");
  });

  it("删除 style 属性，避免覆盖整站布局", () => {
    const out = sanitizeHtml('<p style="position:fixed;inset:0">钓鱼</p>');

    expect(out).not.toContain("style=");
    expect(out).toContain("钓鱼");
  });
});

describe("sanitizeHtml 的协议白名单", () => {
  it("挡掉 javascript: 链接", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">点我</a>');

    expect(out).not.toContain("javascript");
    expect(out).toContain("点我");
  });

  it("挡掉用制表符拆开的 javascript:", () => {
    const out = sanitizeHtml('<a href="java&#9;script:alert(1)">点我</a>');

    expect(out).not.toContain("script:");
  });

  it("挡掉用换行拆开的 javascript:", () => {
    const out = sanitizeHtml('<a href="java\nscript:alert(1)">点我</a>');

    expect(out).not.toContain("script:");
  });

  it("挡掉 data: 图片", () => {
    const out = sanitizeHtml('<img src="data:text/html;base64,PHNjcmlwdD4=">');

    expect(out).not.toContain("data:");
  });

  it("保留 http / https / mailto 链接", () => {
    expect(sanitizeHtml('<a href="https://github.com/x">a</a>')).toContain("https://github.com/x");
    expect(sanitizeHtml('<a href="mailto:me@example.test">a</a>')).toContain("mailto:me@example.test");
  });

  it("保留站内绝对路径与锚点", () => {
    expect(sanitizeHtml('<a href="/gallery">a</a>')).toContain('href="/gallery"');
    expect(sanitizeHtml('<a href="#top">a</a>')).toContain('href="#top"');
  });
});

describe("sanitizeHtml 的链接处理", () => {
  it("外链强制新窗口打开并切断 opener", () => {
    const out = sanitizeHtml('<a href="https://github.com/x">GitHub</a>');

    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("站内路径不强制新窗口", () => {
    expect(sanitizeHtml('<a href="/gallery">Gallery</a>')).not.toContain("target=");
  });

  it("用户自己写的 target 会被覆盖掉", () => {
    const out = sanitizeHtml('<a href="https://github.com/x" target="_self">x</a>');

    expect(out).toContain('target="_blank"');
    expect(out).not.toContain("_self");
  });
});

describe("sanitizeHtml 的白名单", () => {
  it("保留正文常用的标签", () => {
    const html = '<p><strong>粗</strong><em>斜</em><a href="/x">链</a><br></p>';

    expect(sanitizeHtml(html)).toBe(html);
  });

  it("保留列表、标题、引用、代码", () => {
    const html = "<h2>标题</h2><ul><li>项</li></ul><blockquote>引</blockquote><pre><code>x</code></pre>";

    expect(sanitizeHtml(html)).toBe(html);
  });

  it("保留图片的 src 与 alt", () => {
    const out = sanitizeHtml('<img src="/a.png" alt="描述" title="提示">');

    expect(out).toContain('src="/a.png"');
    expect(out).toContain('alt="描述"');
    expect(out).toContain('title="提示"');
  });

  it("白名单外的标签展开，里面的文字不会消失", () => {
    expect(sanitizeHtml("<section><p>正文</p></section>")).toBe("<p>正文</p>");
  });

  it("剥掉白名单标签上不认识的属性", () => {
    expect(sanitizeHtml('<p class="x" id="y" data-z="1">正文</p>')).toBe("<p>正文</p>");
  });
});

describe("sanitizeHtml 的输入处理", () => {
  it("空值返回空串", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
    expect(sanitizeHtml(123)).toBe("");
  });

  it("纯文本原样返回", () => {
    expect(sanitizeHtml("就是一段话")).toBe("就是一段话");
  });

  it("丢弃注释", () => {
    expect(sanitizeHtml("<p>正文</p><!-- 注释 -->")).toBe("<p>正文</p>");
  });
});
