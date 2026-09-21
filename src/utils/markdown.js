/**
 * markdown-it 的唯一封装。
 *
 * html: true 是必需的，不是可选项：markdown-it 默认 false 时会把原生 HTML 转义成
 * 可见文字，正文里内嵌的 <video> 会原样显示为代码文本，无法播放。
 * 开启之后，正文里的 HTML 会原样穿过这里 —— 安全性因此**完全由 sanitizeHtml 兜底**。
 *
 * 所以 renderMarkdown() 返回的是**未消毒**的 HTML，只允许作为 SafeHtml.vue 的输入。
 * 全仓库只有 SafeHtml.vue 一个渲染出口（components/safeHtmlGuard.test.js 守着），
 * 不要把这个函数交给任何别的组件。
 */
import MarkdownIt from "markdown-it";

// 除 html 外只开了 breaks 一项：正文里的单个换行渲染成 <br>，不必空一行才分段。
// linkify / typographer 保持默认关闭：它们会把裸链接、引号与省略号改写成别的形式。
const md = new MarkdownIt({ html: true, breaks: true });

/**
 * 取标题行内的纯文本，用来生成 id。
 *
 * 只累加 text / code_inline / image 三种 token：加粗、斜体、链接的标记本身不进 id，
 * image 的 content 就是它的 alt 文字；原生 HTML（html_inline）跳过，
 * `## <b>标题</b>` 与 `## 标题` 因此得到同一个 id。
 */
function headingText(inline) {
  let text = "";

  for (const child of inline.children || []) {
    if (child.type === "text" || child.type === "code_inline" || child.type === "image") {
      text += child.content;
    }
  }

  return text;
}

/**
 * 标题的 id：github 风格的 slug。
 *
 * 正文里的目录是手写的锚点链接，写法就是 github 那一套 —— 点号冒号引号括号一律去掉、
 * 空格变连字符、字母大小写保留。例如 `## 1.4 输入前置管线：processUserInput`
 * 配的是 `[1.4 …](#14-输入前置管线processUserInput)`。id 按同一规则生成，两边才对得上。
 *
 * 只保留字母、数字、空白与连字符，其余一律删除：标点（`.` `：` `（` `「` `—` `/`）
 * 与数学符号（`=` `<` `>`）在 github 的规则里都不进 slug。
 * 空白逐个换成 `-` 而不是合并连续空白：`工具接口 = harness` 删掉 `=` 后还剩两个空格，
 * 要正好得到 `工具接口--harness` 那样的两个连字符。
 *
 * ⚠️ 不做小写化。github 会转小写，但正文目录里的 `processUserInput`、`SDKMessage`
 * 都保留着原样 —— 跟着目录走才对得上，转了反而脱节。
 */
function headingSlug(text) {
  return text.replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");
}

// 文字完全相同的标题沿用同一个 id，不做去重后缀：手写的锚点只会定位到第一个匹配。
md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const inline = tokens[idx + 1];
  const text = inline && inline.type === "inline" ? headingText(inline) : "";
  const slug = headingSlug(text);

  // 空标题（`##` 后面没有文字、或只有行内标记）不写 id，避免渲染出光秃秃的 id 属性
  if (slug) tokens[idx].attrSet("id", slug);

  return self.renderToken(tokens, idx, options);
};

/**
 * @param {string} source Markdown 原文
 * @returns {string} 未消毒的 HTML
 */
export function renderMarkdown(source) {
  if (!source || typeof source !== "string") return "";
  return md.render(source);
}
