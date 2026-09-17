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
  "video", "source",
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
  video: ["src", "poster", "controls", "preload", "loop", "muted", "playsinline", "width", "height"],
  source: ["src", "type"],
};

const SAFE_LINK_PROTOCOLS = ["http:", "https:", "mailto:"];
// 媒体地址（img 的 src、video 的 src 与 poster）共用这一条规则：只放行 http / https。
// 常量从 SAFE_IMAGE_PROTOCOLS 更名而来 —— 它早就不只管图片了。
// 该常量没有导出，更名不影响任何外部引用。
const SAFE_MEDIA_PROTOCOLS = ["http:", "https:"];

// 嵌套深度上限。真实粘贴的正文远达不到这个深度；超过上限的子树整个删除，
// 这样递归深度有界，深到能把调用栈撑爆的输入不再让本函数抛异常。
const MAX_DEPTH = 100;

/**
 * 去掉全部空白与控制字符再转小写。
 * `java\tscript:alert(1)` 是真实存在的绕过手法，只做前缀匹配挡不住。
 */
function normalizeUrl(value) {
  // 覆盖 NUL 到空格之间的全部空白与控制字符，以及 DEL（0x7f）。
  // 必须写成 \u 转义：直接把控制字符敲进源码，编辑器看不见也复制不走。
  return String(value).replace(/[\u0000-\u0020\u007f]/g, "").toLowerCase();
}

/**
 * 判断一个 url 属于哪一类，只在这里判断一次：
 *
 * - "blocked"：协议不在白名单里，属性整个去掉
 * - "local"：站内绝对路径或锚点，保持原样
 * - "external"：站外地址。链接要强制新窗口并切断 opener，图片正常保留
 *
 * 「保不保留 href」和「要不要补 target」原本是两处各判一次，结果就是协议相对地址
 * 在第一处被当成站内放行、在第二处也被当成站内而跳过外链规则。两类判断必须一致。
 */
function classifyUrl(rawUrl, protocols) {
  const url = normalizeUrl(rawUrl);

  // 锚点没有协议
  if (url.startsWith("#")) return "local";

  if (url.startsWith("/")) {
    // 只有单个 `/` 是站内绝对路径。`//host/x` 与 `/\host/x` 是协议相对地址，
    // 浏览器会用当前页面的 scheme 补全成 http(s) 并指向外部主机，因此按外链处理。
    return url[1] === "/" || url[1] === "\\" ? "external" : "local";
  }

  return protocols.some((protocol) => url.startsWith(protocol)) ? "external" : "blocked";
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
  if (tag === "img") applyMediaRules(el, ["src"]);
  if (tag === "video") applyMediaRules(el, ["src", "poster"]);
}

function applyLinkRules(a) {
  const href = a.getAttribute("href");
  if (href === null) return;

  const kind = classifyUrl(href, SAFE_LINK_PROTOCOLS);

  if (kind === "blocked") {
    a.removeAttribute("href");
    return;
  }

  // 站内路径与锚点保持原样；外链强制新窗口，并切断 opener 引用
  if (kind === "local") return;

  a.setAttribute("target", "_blank");
  a.setAttribute("rel", "noopener noreferrer");
}

/**
 * 媒体地址规则：只放行 http / https，其余把属性整个摘掉（标签与内容留在原地）。
 *
 * img 的 src、video 的 src 与 poster 走同一条规则 —— 三者都是「让访客浏览器去取一个
 * 资源」，风险等级相同；分成两套规则只会让它们渐渐长歪。
 * poster 本质就是一张图片的地址，因此与 src 同等对待。
 */
function applyMediaRules(el, attrs) {
  for (const name of attrs) {
    const value = el.getAttribute(name);
    if (value !== null && classifyUrl(value, SAFE_MEDIA_PROTOCOLS) === "blocked") {
      el.removeAttribute(name);
    }
  }
}

/**
 * 递归处理节点。白名单外的元素**展开**（unwrap）—— 删掉标签本身、保留子节点，
 * 这样用户贴的 <section> 之类语义标签不会让里面的文字跟着消失。
 *
 * depth 是 node 自身的嵌套层数，用来给递归封顶：超过 MAX_DEPTH 的子树整棵删除。
 * 封顶必须删干净 —— 上限只允许让内容消失，不允许让内容漏进输出。
 */
function cleanNode(node, depth) {
  // 从后往前遍历：删除节点会让 childNodes 这个 live 集合的索引错位
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const child = node.childNodes[i];

    // 到上限就把子节点整个删掉，不再往下递归
    if (depth >= MAX_DEPTH) {
      child.remove();
      continue;
    }

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
      cleanNode(child, depth + 1);
      while (child.firstChild) node.insertBefore(child.firstChild, child);
      child.remove();
      continue;
    }

    cleanAttributes(child, tag);
    cleanNode(child, depth + 1);
  }
}

/**
 * @param {string} html 用户输入的原文
 * @returns {string} 只含白名单标签与属性的 HTML
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";

  try {
    const doc = new DOMParser().parseFromString(html, "text/html");

    // 只输出 body 的内容：<style> / <script> 写在片段开头时会被解析器提升到 head，
    // 而 head 根本不进入输出。落在 body 里的那些由 cleanNode 处理。
    cleanNode(doc.body, 0);
    return doc.body.innerHTML;
  } catch {
    // 安全边界不能抛异常：调用方一旦 try/catch 后回退到原文，异常就变成 XSS。
    // 出任何意外都返回空串 —— 空串永远是安全的输出，原文不是。
    return "";
  }
}

export { ALLOWED_TAGS };
