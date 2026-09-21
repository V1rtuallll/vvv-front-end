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
    expect(renderMarkdown("## `code` 文本")).toContain('<h2 id="code-文本">');
    expect(renderMarkdown("## 标题[链接](/x)")).toContain('<h2 id="标题链接">');
    expect(renderMarkdown("## ![图](/a.png)")).toContain('<h2 id="图">');
  });

  it("h1 到 h6 都带 id", () => {
    for (let level = 1; level <= 6; level++) {
      const marks = "#".repeat(level);

      expect(renderMarkdown(`${marks} 标题`)).toContain(`<h${level} id="标题">`);
    }
  });

  it("符号在 slug 阶段就被去掉，不会落进 id", () => {
    // 取代原先「属性里的 & 与引号要转义」那条：slug 只留字母数字与连字符，
    // 需要转义的字符根本到不了 id 上。被删字符两侧的空格各自变成连字符，不合并
    expect(renderMarkdown('## a & "b"')).toContain('<h2 id="a--b">');
    expect(renderMarkdown("## x = y < z")).toContain('<h2 id="x--y--z">');
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

  /**
   * 规则来自线上那篇文章的目录：一百多条锚点全是 github 风格，标题则是作者手写的。
   * 两边按同一套规则生成才对得上 —— 点号冒号括号一律不进 slug、空格变连字符、
   * 字母大小写保留（`processUserInput` 没有被转成小写）。
   */
  it("正文里手写的 github 风格目录与标题 id 对得上", () => {
    const cases = [
      ["## 1.1 核心模块地图", "11-核心模块地图"],
      ["## 1.4 输入前置管线：processUserInput", "14-输入前置管线processUserInput"],
      ["## 3.1 工具接口 = harness 的关注点声明", "31-工具接口--harness-的关注点声明"],
      [
        "## 4.9 可扩展性：Hooks —— 让用户改 harness 的每个生命点",
        "49-可扩展性Hooks--让用户改-harness-的每个生命点",
      ],
      ["## 5.4 /context 可视化", "54-context-可视化"],
      ["## 6.3 阶梯① 时间基微压缩", "63-阶梯①-时间基微压缩"],
      ["## 9.2 第 0 层：起点是「零」", "92-第-0-层起点是零"],
      [
        "## 12.6 日志层（types/logs.ts）—— 只进磁盘，不进上下文",
        "126-日志层typeslogsts-只进磁盘不进上下文",
      ],
      ["## 12.2 一个大坑：type: 'user' 不一定是人说的", "122-一个大坑type-user-不一定是人说的"],
    ];

    for (const [markdown, expected] of cases) {
      const doc = new DOMParser().parseFromString(renderMarkdown(markdown), "text/html");

      expect(doc.querySelector("h2").getAttribute("id")).toBe(expected);
    }
  });

  /**
   * 唯一一条对不上的，记在这里而不是假装它不存在。
   *
   * `## 1.5 SDK 协议：AsyncGenerator<SDKMessage>` 的目录锚点是
   * `#15-SDK-协议AsyncGeneratorSDKMessage` —— 生成目录的工具把尖括号当普通文字。
   * 而本站的 markdown-it 开着 html: true，`<SDKMessage>` 被当成一个 HTML 标签，
   * 标题的可见文字里就没有它，id 因此少一截。
   *
   * 要对上得先决定渲染器怎么对待这种字面量尖括号（转义？还是照旧当标签），
   * 那会改变正文的显示，不是 slug 规则能覆盖的。真要处理时从这里改起。
   */
  it("字面量尖括号会被当 HTML 标签吞掉，这类标题的锚点对不上", () => {
    expect(renderMarkdown("## 1.5 SDK 协议：AsyncGenerator<SDKMessage>")).toContain(
      '<h2 id="15-SDK-协议AsyncGenerator">',
    );
  });
});
