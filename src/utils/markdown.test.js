import { describe, expect, it } from "vitest";

import { renderMarkdown } from "@/utils/markdown";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

describe("renderMarkdown", () => {
  it("把 Markdown 渲染成 HTML", () => {
    expect(renderMarkdown("# 标题")).toContain("<h1>标题</h1>");
  });

  it("原生 HTML 能穿过渲染，video 不会被转义成文字", () => {
    // html: false（markdown-it 的默认值）时这段会被转义成 &lt;video ...&gt;，
    // 视频会显示为代码文本，G3 无法达成
    const out = renderMarkdown('<video src="/a.mp4" controls></video>');

    expect(out).toContain('<video src="/a.mp4"');
    expect(out).not.toContain("&lt;");
  });

  it("代码块里的标签不会被当成 HTML", () => {
    const out = renderMarkdown("```html\n<video src=\"/a.mp4\"></video>\n```");

    expect(out).not.toContain("<video");
    expect(out).toContain("&lt;video");
  });

  it("单个换行渲染成 <br>，不需要空一行", () => {
    // breaks: true（markdown-it 默认是 false，单换行会被当成空格接在一起）
    expect(renderMarkdown("第一行\n第二行")).toBe("<p>第一行<br>\n第二行</p>\n");
  });

  it("空行分段仍然成立", () => {
    expect(renderMarkdown("第一段\n\n第二段")).toBe("<p>第一段</p>\n<p>第二段</p>\n");
  });

  it("空值返回空串", () => {
    expect(renderMarkdown("")).toBe("");
    expect(renderMarkdown(null)).toBe("");
    expect(renderMarkdown(undefined)).toBe("");
    expect(renderMarkdown(123)).toBe("");
  });

  it("渲染结果必须先过消毒再交给渲染出口", () => {
    // 这一条锁的是两个 helper 的组合兼容性：markdown-it 直通输出的原生 HTML，经过
    // sanitizeHtml 之后媒体地址保留、内联事件被剥离。「全仓只有一个消毒出口」不在
    // 本文件覆盖，由 SafeHtml.vue 及其测试（Task 3）负责。
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
