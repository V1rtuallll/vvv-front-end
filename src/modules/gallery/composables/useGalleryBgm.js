import { ref } from "vue";

import { pauseForBgm, resumeAfterBgm } from "@/modules/player/composables/useAudioPlayer";

/**
 * 一条画廊项该播什么。四条分支就是优先级：
 *
 *   1. 自己配了 BGM 的（只有 photo / gif 会有）→ 用它配的那一首；
 *   2. music 项 → 它自己；
 *   3. video 项 → 它自己，但只取音轨（用 video 元素播，画面不显示）；
 *   4. 其余（没配 BGM 的 photo / gif）→ 没有可播的东西。
 *
 * **只有前端有这一份。** 后端只下发 bgmSrc / bgmType 两个字段，不做任何解析 ——
 * 两边各写一份的话，规则一改就会漂移，而漂移的表现是「某些项没声音」：
 * 页面不报错，很难查。
 */
export function resolveBgm(item) {
  if (!item) return null;
  if (item.bgmSrc) {
    // bgmType 由后端成对下发；真碰到不完整的行时按 audio 处理 ——
    // 因为一个脏字段让整条项彻底不播，比按最常见的类型兜底更糟
    return { src: item.bgmSrc, type: item.bgmType === "video" ? "video" : "audio" };
  }
  if (item.type === "music") return { src: item.src, type: "audio" };
  if (item.type === "video") return { src: item.src, type: "video" };
  return null;
}

/**
 * 详情弹窗的背景音乐播放。
 *
 * 播放规则（D5）：
 *   · **循环**；
 *   · **按源文件原始音量** —— 所以这里一个字都不设 volume，写了就等于把音量钉死；
 *   · 起播前让侧栏播放器让位，停止时只把它还原成原来的样子。
 *
 * @param createElement 建媒体元素的工厂。默认用 document.createElement；
 *                      测试注入替身即可在没有解码器的环境里断言起播行为。
 */
export function useGalleryBgm(createElement = (tag) => document.createElement(tag)) {
  /** 当前正在播的曲子 { src, type }；null 表示没在播 */
  const activeBgm = ref(null);
  /** 当前正在播的项的 id。同一条项重复打开时靠它避免从头再放一遍 */
  const activeId = ref(null);
  let element = null;

  const releaseElement = () => {
    if (!element) return;
    element.pause();
    element = null;
  };

  /**
   * 本实例有没有真的把侧栏接管过来。
   *
   * `pauseForBgm` 只在侧栏**本来在播**时才接管并返回 `true`。侧栏已经被
   * 别的实例让位时（详情弹窗在播，选择器里又试听），本实例的让位是空转 ——
   * 它**没开过窗口，就无权关**。否则关掉编辑弹窗会把侧栏解停，而详情弹窗的
   * BGM 还在播，两路音频一起响。
   *
   * 用 sticky-OR 累积：同一实例内多次换项，第一次接管就算数。
   */
  let openedWindow = false;

  const stop = () => {
    // 没在播就什么都不做：一道便宜的空跑早退。
    //
    // 它**不是**侧栏的保护伞 —— 侧栏现在由下面的 openedWindow 守着：只有开过
    // 窗口（即本实例正持有曲目）的实例才会走到 resumeAfterBgm，而 activeBgm
    // 非空正是「持有曲目」的条件。去掉这道 return 不改变任何可观察行为，
    // 留着只是为了不白跑 releaseElement 和清状态这一串。
    if (activeBgm.value === null) return;
    releaseElement();
    activeBgm.value = null;
    activeId.value = null;
    // 谁开的窗口谁关 —— 没开过的实例不许解停侧栏
    if (openedWindow) {
      openedWindow = false;
      resumeAfterBgm();
    }
  };

  /**
   * 直接播一个 { src, type }。供「刚上传完立刻试听」这类还没有画廊项的场景用。
   *
   * @param id 身份标识，用于「同一条不重复起播」。默认取地址
   */
  const playSource = (source, id = source?.src ?? null) => {
    if (!source?.src) return stop();
    if (activeId.value !== null && String(activeId.value) === String(id)) return;

    releaseElement();
    // 先让侧栏闭嘴，再起自己的。记下是不是**我们**把它按下去的 ——
    // 记错了，stop() 就会去解停一个不是我们开的窗口
    openedWindow = pauseForBgm() || openedWindow;

    const el = createElement(source.type === "video" ? "video" : "audio");
    el.loop = true;
    el.src = source.src;
    element = el;
    activeBgm.value = source;
    activeId.value = id;

    // 起播失败只意味着没声音，不该影响看图。浏览器的自动播放策略、
    // 地址 404、OSS 挂掉，全都静默降级在这里
    const started = el.play();
    if (started && typeof started.catch === "function") started.catch(() => {});
  };

  const play = (item) => {
    const source = resolveBgm(item);
    if (!source) return stop();
    playSource(source, item?.id ?? source.src);
  };

  return { activeBgm, activeId, play, playSource, stop };
}
