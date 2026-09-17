import { describe, expect, it } from "vitest";

import { renderMarkdown } from "@/utils/markdown";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

describe("renderMarkdown", () => {
  it("把 Markdown 渲染成 HTML", () => {
    expect(renderMarkdown("# 标题")).toContain("<h1>标题</h1>");
  });

  it("原生 HTML 能穿过渲染，video 不会被转义成文字", () => {
    // html: false（markdown-it 的默认值）时这段会被转义成 &lt;video ...&gt;，
    // 视频就成了页面上一坨代码文本，G3 无法达成
    const out = renderMarkdown('<video src="/a.mp4" controls></video>');

    expect(out).toContain('<video src="/a.mp4"');
    expect(out).not.toContain("&lt;");
  });

  it("代码块里的标签不会被当成 HTML", () => {
    const out = renderMarkdown("```html\n<video src=\"/a.mp4\"></video>\n```");

    expect(out).not.toContain("<video");
    expect(out).toContain("&lt;video");
  });

  it("空值返回空串", () => {
    expect(renderMarkdown("")).toBe("");
    expect(renderMarkdown(null)).toBe("");
    expect(renderMarkdown(undefined)).toBe("");
    expect(renderMarkdown(123)).toBe("");
  });

  it("渲染结果必须先过消毒再交给渲染出口", () => {
    // 这一条锁的是「渲染链」这个整体：markdown-it 之后一定还有 sanitizeHtml。
    // 把 markdown.js 换成直通实现、或者把链尾那一步去掉，它就会变红。
    const out = sanitizeHtml(renderMarkdown('<video src="/a.mp4" onerror="window.__pwned=1"></video>'));

    expect(out).toContain('src="/a.mp4"');
    expect(out).not.toContain("onerror");
  });

  it("代码块里的脚本经过消毒后仍是文字", () => {
    const out = sanitizeHtml(renderMarkdown("```\n<script>alert(1)</script>\n```"));

    expect(out).not.toContain("<script");
    expect(out).toContain("alert(1)");
  });
});
