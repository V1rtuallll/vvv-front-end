import { toRaw } from 'vue'  // toRaw：剥掉 Vue 的 Proxy 外壳，拿到原始对象

/** 取不到时间时的统一文案：数据缺失要如实说，不能显示成某个具体日期 */
const UNKNOWN_DATE = "未知时间";

/**
 * 把各种输入解析成 Date，解析不出来返回 null。
 *
 * 支持三种输入：时间字符串、Date、以及带 createdAt/createTime 等字段的对象
 * （对象会先用 toRaw 剥掉 Vue 的 Proxy 外壳）。
 *
 * 注意 null/空串必须走 null 分支：`new Date(null)` 不报错，它会得到 1970-01-01，
 * 于是界面上出现一个看起来像真日期的错误时间。
 */
function toDate(input) {
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (!input) return null;

  let timeStr = input;
  if (typeof input === 'object') {
    const raw = toRaw(input);
    timeStr = raw.createdAt || raw.createTime || raw.createdTime || raw.createAt;
    if (!timeStr) return null;
  }

  const date = new Date(timeStr);
  return isNaN(date.getTime()) ? null : date;
}

// 完整时间：2026年9月13日 15:57:41
const formatDate = (input) => {
  const date = toDate(input);
  if (!date) return UNKNOWN_DATE;

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// 简短日期：2026/9/13
const formatShortDate = (input) => {
  const date = toDate(input);
  return date ? date.toLocaleDateString("zh-CN") : UNKNOWN_DATE;
};

export { formatDate, formatShortDate, UNKNOWN_DATE };