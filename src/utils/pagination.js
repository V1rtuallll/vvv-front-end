/** 当前页两侧各展开几个页码 */
const SPAN = 2;

/** 省略号占位。`pageNumbers` 的返回值里数字与它混排，渲染时按类型分支 */
const GAP = "…";

/**
 * 把地址栏里的 page 参数解析成正整数页码，解析不出来一律当第一页。
 *
 * 非法的来路很多：手改地址（`?page=abc`）、复制时截断（`?page=`）、
 * 以及 vue-router 遇到重复参数给出的数组（`?page=2&page=5`，取第一个）。
 * 这里不做「报错」处理 —— 页码只是个视图参数，静默回到第一页比弹一条错误更合适。
 */
export function parsePageParam(raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * 算出页码条上要显示哪些页码，被折叠的地方用 {@link GAP} 占位。
 *
 * 规则：当前页居中、左右各 {@link SPAN} 个；首尾两页常显；
 * 窗口离边界只差 {@link SPAN} 页时直接铺到边界 —— 不这么做的话，
 * 第 2 页会渲染成「1 [2] 3 4 … 20」旁边再单独夹一个孤零零的 5。
 *
 * 页码总数少（约两倍 SPAN + 5 以内）时自然退化成全平铺，不会出现省略号。
 *
 * @param {number} current    当前页，越界时收敛到 [1, totalPages]
 * @param {number} totalPages 总页数，小于 1 时返回空数组
 * @returns {(number|string)[]} 如 `[1, "…", 4, 5, 6, 7, 8, "…", 20]`
 */
export function pageNumbers(current, totalPages) {
  const last = Number.isFinite(totalPages) ? Math.trunc(totalPages) : 0;
  if (last < 1) return [];

  const wanted = Number.isFinite(current) ? Math.trunc(current) : 1;
  const active = Math.min(Math.max(wanted, 1), last);

  let start = Math.max(1, active - SPAN);
  let end = Math.min(last, active + SPAN);
  if (start <= SPAN + 1) start = 1;
  if (end >= last - SPAN) end = last;

  const pages = [];
  if (start > 1) pages.push(1, GAP);
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < last) pages.push(GAP, last);
  return pages;
}
