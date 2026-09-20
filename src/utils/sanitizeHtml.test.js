import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "@/utils/sanitizeHtml";

describe("sanitizeHtml 的危险内容处理", () => {
  it("删除正文里的 script 标签连同它的内容", () => {
    // script 必须写在正文元素之后。写在片段开头的 <script> 会被解析器提升进 <head>，
    // 而 head 根本不进输出 —— 那样这条用例即使删掉整个 DROPPED_TAGS 也照样通过。
    const out = sanitizeHtml("<p>正文</p><script>alert(1)</script>");

    expect(out).toBe("<p>正文</p>");
    expect(out).not.toContain("alert");
  });

  it("删除嵌在白名单标签里的 script 连同它的内容", () => {
    const out = sanitizeHtml("<div><p>正文</p><script>alert(1)</script></div>");

    expect(out).toBe("<div><p>正文</p></div>");
    expect(out).not.toContain("alert");
  });

  it("删除正文里的 style 标签连同它的内容，避免贴的样式串到整站", () => {
    // 与 script 同理：写在片段开头的 <style> 会被提升进 <head>，测不到删除逻辑
    const out = sanitizeHtml("<p>正文</p><style>.vf-nav{display:none}</style>");

    expect(out).toBe("<p>正文</p>");
    expect(out).not.toContain("vf-nav");
  });

  it("删除 svg 外来内容，连它内部的样式与文字一起", () => {
    // svg 若只是「展开」而不是删除，内部的 style 与文字会落进正文
    const out = sanitizeHtml("<p>正文</p><svg><style>body{display:none}</style>留下</svg>");

    expect(out).toBe("<p>正文</p>");
    expect(out).not.toContain("display:none");
    expect(out).not.toContain("留下");
  });

  it("删除 math 外来内容，连它内部的文字一起", () => {
    expect(sanitizeHtml("<p>正文</p><math><mi>x</mi>公式</math>")).toBe("<p>正文</p>");
  });

  it("删除 iframe，它内部的原文不会变成正文", () => {
    // iframe 的内容按 raw text 解析，里面的 <p> 不会被当成标签。
    // 若只是展开 iframe，这段原文会以文字形式落进正文。
    const out = sanitizeHtml('<p>正文</p><iframe src="https://evil.test"><p>内层</p></iframe>');

    expect(out).toBe("<p>正文</p>");
  });

  it("删除 form，它内部的内容不会变成正文", () => {
    const out = sanitizeHtml('<p>正文</p><form action="/x"><input name="p"><p>在表单里</p></form>');

    expect(out).toBe("<p>正文</p>");
  });

  it("删除内联事件属性", () => {
    const out = sanitizeHtml('<img src="/a.png" onerror="window.__pwned=1">');

    // 断言输出内容本身：只留下允许的属性
    expect(out).toBe('<img src="/a.png">');
    expect(out).not.toContain("onerror");
  });

  it("删除 a 上的内联事件属性", () => {
    const out = sanitizeHtml('<a href="/x" onclick="alert(1)">链接</a>');

    expect(out).not.toContain("onclick");
    expect(out).toContain("链接");
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

  it("锚点不强制新窗口", () => {
    expect(sanitizeHtml('<a href="#top">顶部</a>')).not.toContain("target=");
  });

  it("用户自己写的 target 会被覆盖掉", () => {
    const out = sanitizeHtml('<a href="https://github.com/x" target="_self">x</a>');

    expect(out).toContain('target="_blank"');
    expect(out).not.toContain("_self");
  });

  it("双斜杠开头的协议相对地址按外链处理", () => {
    // //host/x 会被浏览器补上当前页面的 scheme，指向的是外部主机，不是站内路径
    const out = sanitizeHtml('<a href="//evil.test/x">链接</a>');

    expect(out).toContain("evil.test");
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("反斜杠开头的协议相对地址同样按外链处理", () => {
    // /\host/x 里的反斜杠会被浏览器当成路径分隔符，等价于 //host/x
    const out = sanitizeHtml('<a href="/\\evil.test/x">链接</a>');

    expect(out).toContain("evil.test");
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("带前导空白的协议相对地址也按外链处理", () => {
    const out = sanitizeHtml('<a href="  //evil.test/x">链接</a>');

    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
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

describe("sanitizeHtml 的健壮性", () => {
  it("嵌套超过深度上限时删除子树，不抛异常", () => {
    // 500 层本身能正常解析，内容消失只可能是深度上限把它删掉了
    const html = `${"<div>".repeat(500)}深层内容${"</div>".repeat(500)}`;

    let out;
    expect(() => {
      out = sanitizeHtml(html);
    }).not.toThrow();
    expect(out).not.toContain("深层内容");
  });

  // 这条要造 5000 层嵌套，解析耗时随机器速度浮动很大：
  // 同一提交在本机先过、在 CI runner 上会撞破默认的 5 秒。它的断言是
  // 「不抛异常」+「深层内容被丢弃」，从来没声称「必须 5 秒内跑完」，
  // 所以给一个宽裕的预算，而不是把深度改小（那样会削弱压力）。
  it("极端深度的嵌套既不抛异常也不漏内容", { timeout: 20000 }, () => {
    const html = `${"<div>".repeat(5000)}深层内容${"</div>".repeat(5000)}`;

    let out;
    expect(() => {
      out = sanitizeHtml(html);
    }).not.toThrow();
    expect(out).not.toContain("深层内容");
  });

  it("正常深度的嵌套不受深度上限影响", () => {
    const html = "<div><p><strong>正文</strong></p></div>";

    expect(sanitizeHtml(html)).toBe(html);
  });

  it("解析环节出错时返回空串，不抛异常也不返回原文", () => {
    // 只有让解析器抛异常才能覆盖兜底分支：安全边界一旦把异常抛给调用方，
    // try/catch 回退到原文的调用方就会把它变成 XSS
    const original = globalThis.DOMParser;

    globalThis.DOMParser = class {
      parseFromString() {
        throw new Error("parse failed");
      }
    };

    try {
      let out;
      expect(() => {
        out = sanitizeHtml("<p>正文</p>");
      }).not.toThrow();
      expect(out).toBe("");
    } finally {
      globalThis.DOMParser = original;
    }
  });
});

describe("sanitizeHtml 的媒体白名单", () => {
  it("保留 video 的地址与控制属性", () => {
    const out = sanitizeHtml('<video src="/a.mp4" controls loop muted playsinline></video>');

    expect(out).toBe('<video src="/a.mp4" controls="" loop="" muted="" playsinline=""></video>');
  });

  it("保留 video 的 poster、preload 与尺寸", () => {
    expect(sanitizeHtml('<video poster="/p.png" preload="metadata" width="640" height="360"></video>'))
      .toBe('<video poster="/p.png" preload="metadata" width="640" height="360"></video>');
  });

  it("保留 source 的 src 与 type", () => {
    expect(sanitizeHtml('<video><source src="/a.mp4" type="video/mp4"></video>'))
      .toBe('<video><source src="/a.mp4" type="video/mp4"></video>');
  });

  it("剥掉 video 上的内联事件属性，保留它的地址", () => {
    const out = sanitizeHtml('<video src="/a.mp4" onerror="window.__pwned=1"></video>');

    expect(out).toBe('<video src="/a.mp4"></video>');
    expect(out).not.toContain("onerror");
  });

  it("剥掉 source 上的内联事件属性", () => {
    const out = sanitizeHtml('<video><source src="/a.mp4" type="video/mp4" onerror="alert(1)"></video>');

    expect(out).not.toContain("onerror");
    expect(out).toContain('src="/a.mp4"');
  });

  it("video 的地址与图片同一条协议规则，非法协议被摘掉", () => {
    expect(sanitizeHtml('<video src="javascript:alert(1)"></video>')).toBe("<video></video>");
  });

  it("poster 同样受协议规则约束", () => {
    expect(sanitizeHtml('<video src="/a.mp4" poster="data:text/html;base64,PHNjcmlwdD4="></video>'))
      .toBe('<video src="/a.mp4"></video>');
  });

  it("source 的地址与图片视频共用同一条协议规则，data: 被摘掉、type 保留", () => {
    expect(sanitizeHtml('<video><source src="data:text/html;base64,PHNjcmlwdD4=" type="video/mp4"></video>'))
      .toBe('<video><source type="video/mp4"></video>');
  });

  it("source 的 javascript: 地址被摘掉，站内绝对路径不受影响", () => {
    expect(sanitizeHtml('<video><source src="javascript:alert(1)"></video>')).toBe("<video><source></video>");
    expect(sanitizeHtml('<video><source src="/a.mp4" type="video/mp4"></video>'))
      .toBe('<video><source src="/a.mp4" type="video/mp4"></video>');
  });

  it("放行 video 没有让 DROPPED_TAGS 松动", () => {
    const out = sanitizeHtml('<p>正文</p><object data="/x"></object><embed src="/y"><iframe src="/z"></iframe>');

    expect(out).toBe("<p>正文</p>");
  });
});
