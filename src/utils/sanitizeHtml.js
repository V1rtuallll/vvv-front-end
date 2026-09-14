/**
 * 把用户输入的 HTML 收敛成一份安全的白名单子集。
 *
 * 为什么用 DOMParser 而不是正则：parseFromString 生成的是**惰性文档** ——
 * 图片不会发起加载、脚本不会执行。安全性因此不依赖过滤规则本身写得对。
 *
 * 策略是白名单而不是黑名单：只保留认识的标签和属性，
 * 而不是「把认识的坏东西删掉」—— 后者永远会漏。
 */

// 保留这些标签。属性一律先剥光，再按 ALLOWED_ATTRS 补回允许的几个。
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "del", "ins",
  "a", "img",
  "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "code", "pre",
  "span", "div",
  "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
]);

// 这些标签连同子树一起删除。
// script / style 必须连内容一起删：只删标签的话，JS 与 CSS 的源码会变成页面上的可见文字。
// svg / math 是外来内容（foreign content），历来是 XSS 的常用载体。
const DROPPED_TAGS = new Set([
  "script", "style", "iframe", "object", "embed",
  "form", "input", "button", "select", "textarea",
  "link", "meta", "base", "svg", "math", "template", "noscript",
]);

const ALLOWED_ATTRS = {
  a: ["href", "title"],
  img: ["src", "alt", "title"],
};

const SAFE_LINK_PROTOCOLS = ["http:", "https:", "mailto:"];
const SAFE_IMAGE_PROTOCOLS = ["http:", "https:"];

/**
 * 去掉全部空白与控制字符再转小写。
 * `java\tscript:alert(1)` 是真实存在的绕过手法，只做前缀匹配挡不住。
 */
function normalizeUrl(value) {
  // 覆盖 NUL 到空格之间的全部空白与控制字符，以及 DEL（0x7f）。
  // 必须写成 \u 转义：直接把控制字符敲进源码，编辑器看不见也复制不走。
  return String(value).replace(/[\u0000-\u0020\u007f]/g, "").toLowerCase();
}

function hasSafeProtocol(rawUrl, protocols) {
  const url = normalizeUrl(rawUrl);

  // 站内绝对路径与锚点没有协议，直接放行
  if (url.startsWith("/") || url.startsWith("#")) return true;

  return protocols.some((protocol) => url.startsWith(protocol));
}

/** 去掉属性后按白名单补回；协议不合法就剔除该属性，而不是删掉整个元素 */
function cleanAttributes(el, tag) {
  const allowed = ALLOWED_ATTRS[tag] || [];

  for (const attr of Array.from(el.attributes)) {
    if (!allowed.includes(attr.name.toLowerCase())) {
      el.removeAttribute(attr.name);
    }
  }

  if (tag === "a") applyLinkRules(el);
  if (tag === "img") applyImageRules(el);
}

function applyLinkRules(a) {
  const href = a.getAttribute("href");
  if (href === null) return;

  if (!hasSafeProtocol(href, SAFE_LINK_PROTOCOLS)) {
    a.removeAttribute("href");
    return;
  }

  // 站内路径与锚点保持原样；外链强制新窗口，并切断 opener 引用
  const url = normalizeUrl(href);
  if (url.startsWith("/") || url.startsWith("#")) return;

  a.setAttribute("target", "_blank");
  a.setAttribute("rel", "noopener noreferrer");
}

function applyImageRules(img) {
  const src = img.getAttribute("src");
  if (src !== null && !hasSafeProtocol(src, SAFE_IMAGE_PROTOCOLS)) {
    img.removeAttribute("src");
  }
}

/**
 * 递归处理节点。白名单外的元素**展开**（unwrap）—— 删掉标签本身、保留子节点，
 * 这样用户贴的 <section> 之类语义标签不会让里面的文字跟着消失。
 */
function cleanNode(node) {
  // 从后往前遍历：删除节点会让 childNodes 这个 live 集合的索引错位
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const child = node.childNodes[i];

    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove(); // 注释、CDATA 之类一律丢弃
      continue;
    }

    const tag = child.tagName.toLowerCase();

    if (DROPPED_TAGS.has(tag)) {
      child.remove();
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      cleanNode(child);
      while (child.firstChild) node.insertBefore(child.firstChild, child);
      child.remove();
      continue;
    }

    cleanAttributes(child, tag);
    cleanNode(child);
  }
}

/**
 * @param {string} html 用户输入的原文
 * @returns {string} 只含白名单标签与属性的 HTML
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";

  const doc = new DOMParser().parseFromString(html, "text/html");

  // 只输出 body 的内容：<style> / <script> 写在片段开头时会被解析器提升到 head，
  // 而 head 根本不进入输出。落在 body 里的那些由 cleanNode 处理。
  cleanNode(doc.body);
  return doc.body.innerHTML;
}

export { ALLOWED_TAGS };
