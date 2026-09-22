import { usePlayerStore } from "@/stores/player";

/**
 * 全站媒体音量的运行时层 —— **唯一写 `el.volume` 的地方**。
 *
 * 职责分两层：
 *   · 持久化的那个数字在 Pinia store 里（刷新要记得住）；
 *   · 「哪些元素正在跟它走」和「谁正被提示音压低」是纯运行时状态，
 *     存的是 DOM 元素本身，不能进 store、更不能持久化。
 *
 * 为什么不需要 watch：写入口只有一个 —— 右栏滑块调 `setVolume`，
 * 它当场遍历所有已登记元素改音量，所以天然是实时的。
 */

/** 提示音压低时乘的系数。与 App.vue 原来的行为一致 */
export const DUCK_FACTOR = 0.1;

/** 已登记的媒体元素。用 Set 而不是数组：重复登记要幂等 */
const registered = new Set();

/** 当前正被提示音压低的元素 */
const ducked = new Set();

const clamp = (value) => Math.min(1, Math.max(0, Number(value) || 0));

const volumeOf = () => clamp(usePlayerStore().volume);

/** 当前音量（0..1）。压低不改变它 —— 压低是另一层的事 */
export const getVolume = () => volumeOf();

/**
 * 把一个媒体元素交给全局音量管。
 *
 * 登记时立刻写一次：等下次拖滑块才生效的话，页面刷新后新挂上的媒体会以
 * 浏览器默认的 1.0 出声，而用户上次明明调到了 30%。
 */
export function registerMediaElement(el) {
  if (!el) return;
  registered.add(el);
  applyVolume(el);
}

/**
 * 把元素从登记表里摘掉。**元素销毁时必须走这一步。**
 *
 * 登记表持有的是元素本身。详情弹窗的视频、画廊 BGM 那个从不进 DOM 的元素，
 * 都是随组件或每次起播创建又销毁的；留在表里的话，它们既不会被回收，
 * 滑块每动一次还要去写一个已经销毁的元素。
 *
 * 压低名单是同一批元素的另一处引用，一并清掉：那是一条已经结束的压低记录，
 * 留着没有任何用处。
 */
export function unregisterMediaElement(el) {
  if (!el) return;
  registered.delete(el);
  ducked.delete(el);
}

/** 按当前音量（并考虑压低状态）写一次这个元素的 volume */
export function applyVolume(el) {
  if (!el) return;
  const base = volumeOf();
  el.volume = ducked.has(el) ? base * DUCK_FACTOR : base;
}

/** 右栏滑块的唯一写入口：改 store 并让所有已登记元素当场跟上 */
export function setVolume(value) {
  usePlayerStore().volume = clamp(value);
  registered.forEach(applyVolume);
}

/** 提示音要响了，这个元素先让路 */
export function markDucked(el) {
  if (!el) return;
  ducked.add(el);
}

/** 提示音放完了，按**当前**音量还原 */
export function clearDucked(el) {
  if (!el) return;
  ducked.delete(el);
  applyVolume(el);
}
