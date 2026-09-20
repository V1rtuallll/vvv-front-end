/**
 * 视口能力探测工具。
 *
 * 布局以 CSS media query 为主，这里只处理 CSS 无法表达的情况：
 * 当前是否为窄屏（需要按视口切换交互方式时使用）。
 *
 * 三档断点与 CSS 保持一致：<=1024px 平板、<=768px 竖屏平板与手机、<=480px 小屏手机。
 *
 * `supportsHover` 目前没有调用方：首页两处信息栏（主展示、拼图卡）都已改为常显，
 * 全项目不再有 @mouseenter / @mouseleave。保留导出供以后需要按指针能力分流时使用。
 */

export const HOVER_MEDIA_QUERY = "(hover: hover)";
export const NARROW_VIEWPORT_WIDTH = 768;

const resolveWindow = () => (typeof window === "undefined" ? null : window);

/**
 * 当前设备是否有可用的 hover 指针。
 * 无法探测时按支持 hover 处理，保持桌面行为不变。
 */
export function supportsHover(win = resolveWindow()) {
  if (!win || typeof win.matchMedia !== "function") return true;
  try {
    return win.matchMedia(HOVER_MEDIA_QUERY).matches === true;
  } catch {
    return true;
  }
}

/**
 * 当前视口是否为窄屏。
 */
export function isNarrowViewport(win = resolveWindow(), breakpoint = NARROW_VIEWPORT_WIDTH) {
  if (!win || typeof win.innerWidth !== "number") return false;
  return win.innerWidth <= breakpoint;
}
