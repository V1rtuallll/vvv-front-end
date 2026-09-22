/**
 * 作品封面的取法，全前端只有这一份。
 *
 * 封面在服务端下了两份：列表行上的 src / type，与 media[0]。两者之间没有外键、
 * 也没有唯一约束，谁也保证不了另一份被同步更新 —— 详情弹窗按 media 翻阅，
 * 卡片按 src 渲染，各用一份的话两边会显示不同的封面，而且不报错。
 * 规则是：media 非空时一律以 media[0] 为准，只有 media 为空（列表接口不带媒体、
 * 回填之前的历史行）才回落到行上的 src / type。
 *
 * 返回的对象带 id，调用方只取 src / type 就够，不要拿它去覆盖整行。
 */
export const coverOf = (item) =>
  item?.media?.length ? item.media[0] : { id: null, src: item?.src ?? null, type: item?.type ?? null };

/**
 * 详情弹窗要翻的媒体列表。
 *
 * media 为空是合法形状，表示「这条作品只登记了封面这一条」——
 * 按「没有媒体」渲染会留出一片空白，而封面明明还在。
 */
export const mediaListOf = (item) => (item?.media?.length ? item.media : item ? [coverOf(item)] : []);
