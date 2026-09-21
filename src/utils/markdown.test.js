import { describe, expect, it } from "vitest";

import { renderMarkdown } from "@/utils/markdown";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

describe("renderMarkdown", () => {
  it("把 Markdown 渲染成 HTML", () => {
    // 标题带 id —— 正文里的手写目录靠它定位，细则见下方「renderMarkdown 的标题 id」
    expect(renderMarkdown("# 标题")).toContain('<h1 id="标题">标题</h1>');
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

describe("renderMarkdown 的标题 id", () => {
  it("id 取标题的纯文本，行内标记不进入 id", () => {
    expect(renderMarkdown("## **粗体**")).toContain('<h2 id="粗体">');
    expect(renderMarkdown("## `code` 文本")).toContain('<h2 id="code 文本">');
    expect(renderMarkdown("## 标题[链接](/x)")).toContain('<h2 id="标题链接">');
    expect(renderMarkdown("## ![图](/a.png)")).toContain('<h2 id="图">');
  });

  it("h1 到 h6 都带 id", () => {
    for (let level = 1; level <= 6; level++) {
      const marks = "#".repeat(level);

      expect(renderMarkdown(`${marks} 标题`)).toContain(`<h${level} id="标题">`);
    }
  });

  it("id 里的 & 与引号按属性上下文转义，解回来仍是标题原文", () => {
    const out = renderMarkdown('## a & "b"');
    const doc = new DOMParser().parseFromString(out, "text/html");

    expect(out).toContain("&amp;");
    expect(doc.querySelector("h2").getAttribute("id")).toBe('a & "b"');
  });

  it("文字相同的标题沿用同一个 id，不加去重后缀", () => {
    // 手写的 #小结 本来就只会定位到第一个匹配，加后缀反而让链接与标题对不上
    const out = renderMarkdown("## 小结\n\n## 小结");

    expect(out.match(/id="小结"/g)).toHaveLength(2);
    expect(out).not.toContain("小结-1");
  });

  it("没有文字的标题不写 id", () => {
    expect(renderMarkdown("##")).not.toContain("id");
  });

  it("手写目录的锚点与标题 id 对得上", () => {
    // 端到端：目录链接与标题在同一份文档里，两者都要过消毒还能对上
    const safe = sanitizeHtml(renderMarkdown("[第一节](#第一节)\n\n## 第一节"));
    const doc = new DOMParser().parseFromString(safe, "text/html");

    const href = doc.querySelector("a").getAttribute("href");
    const id = doc.querySelector("h2").getAttribute("id");

    // href 渲染成了百分号编码，浏览器匹配锚点前会解回来
    expect(href).not.toBe("#第一节");
    expect(decodeURIComponent(href)).toBe(`#${id}`);
  });
});
