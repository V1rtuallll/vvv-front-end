/**
 * 点「详情」那一下拍下的播放进度快照（图集翻到第几张、视频放到第几秒、BGM 放到第几秒）。
 *
 * 承载方式是内存里的一格，不是地址参数。理由是地址参数办不到这件事：
 *   · 画廊的深链（`?src=…`）被消费完就会 `router.replace` 清掉，写进去也留不住，
 *     只会在地址栏里闪一下；
 *   · 进度是片刻的观看状态，不是这条作品的标识 —— 写成可以分享的链接，
 *     别人打开会从第 37 秒开始，那不是任何人的意图。
 *
 * 快照只在「首页主展示 → 详情」这一条路上用，取用时按 src 确认是同一件作品，
 * 且**取完即清**：留着它会落到下一次不相干的打开上，表现是那一条忽然从中间开始，
 * 而这一次用户根本没点过详情。
 */

/**
 * 快照的有效期。
 *
 * 快照本来一定会被消费掉，只有「详情没打开成功」时会剩下来 —— 深链查不到
 * （作品在首页加载之后被删了）、请求在途时用户已经改看别的条目。那种情况下它没有
 * 被取走，也没有被清掉，之后再遇到同一件作品的深链就会误用。给一个期限，
 * 让这一格的寿命有上界。
 */
const MAX_AGE = 15_000;

/** 正数才算进度。0、负数、NaN、非数字一律记成 null，详情那边据此决定不跳 */
const positive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

/** 待取用的快照；同一时刻最多一格，新的覆盖旧的 */
let pending = null;

/**
 * 拍一张快照。
 *
 * @param src 作品的媒体地址，也是取用时的比对依据。空值时这一格清空 ——
 *            没有标识就无法确认取到的是同一件作品
 * @param snapshot { mediaIndex, mediaTime, bgmTime }，缺项按「没有进度」处理
 */
export function stashResume(src, { mediaIndex = 0, mediaTime = 0, bgmTime = 0 } = {}) {
  if (!src) {
    pending = null;
    return;
  }
  const index = Math.trunc(Number(mediaIndex));
  pending = {
    src: String(src),
    at: Date.now(),
    mediaIndex: Number.isFinite(index) ? Math.max(index, 0) : 0,
    mediaTime: positive(mediaTime),
    bgmTime: positive(bgmTime),
  };
}

/**
 * 取走某件作品的快照。
 *
 * 无论命中与否都会把这一格清掉：没命中的那张快照已经是无主的了，留着只会污染
 * 后面某一次打开。
 *
 * @returns 命中的快照；没有、已过期或 src 对不上时返回 null
 */
export function takeResume(src) {
  const snapshot = pending;
  pending = null;
  if (!snapshot || !src || snapshot.src !== String(src)) return null;
  if (Date.now() - snapshot.at > MAX_AGE) return null;
  return snapshot;
}
