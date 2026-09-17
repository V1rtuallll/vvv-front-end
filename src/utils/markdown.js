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
 * @param {string} source Markdown 原文
 * @returns {string} 未消毒的 HTML
 */
export function renderMarkdown(source) {
  if (!source || typeof source !== "string") return "";
  return md.render(source);
}
