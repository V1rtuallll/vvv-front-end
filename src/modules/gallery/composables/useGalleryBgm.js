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
 * 当前正在发声的实例（composable 的返回对象）。`null` 表示没有实例在响。
 *
 * **同一时刻只准一个实例出声。** 全站有两个实例：详情弹窗一个、编辑弹窗里的
 * 选择器一个。两个实例各建各的媒体元素，而 `pauseForBgm` 只管侧栏 ——
 * 详情弹窗开着时从它里面打开编辑弹窗试听，详情弹窗的曲子不会停，两路音频
 * 就会一起响，且没有控件解释多出来的那一路。
 */
let soundingInstance = null;

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
  /** 手动暂停中。与 stop() 的区别：元素还在、进度还在，resume 是从原处接着放 */
  const paused = ref(false);
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
    paused.value = false;
    // 自己不再发声，就把「当前发声者」这个槽位也让出去
    if (soundingInstance === api) soundingInstance = null;
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
    // 去重要连地址一起比：详情弹窗按 (id, bgmSrc, bgmType) 监听，同一条项换了
    // 曲子也会再叫一次 playSource。只比 id 的话那次换播会被当成重复跳过，
    // 用户挑的新曲子不响，响的还是旧的那一首
    if (
      activeId.value !== null
      && String(activeId.value) === String(id)
      && activeBgm.value?.src === source.src
    ) return;

    releaseElement();
    // 别的实例还在响就先把它停掉。**顺序是固定的一环**：它的 stop() 会先把
    // 侧栏还原，我们随后的 pauseForBgm() 才谈得上真正接管（否则这一让是空转）。
    // 两步调换的话，停掉对方之后侧栏会留在它解停后的状态，而我们没接管成功
    if (soundingInstance && soundingInstance !== api) soundingInstance.stop();
    soundingInstance = api;
    // 先让侧栏闭嘴，再起自己的。记下是不是**我们**把它按下去的 ——
    // 记错了，stop() 就会去解停一个不是我们开的窗口
    openedWindow = pauseForBgm() || openedWindow;

    const el = createElement(source.type === "video" ? "video" : "audio");
    el.loop = true;
    el.src = source.src;
    element = el;
    activeBgm.value = source;
    activeId.value = id;
    paused.value = false;

    // 起播失败只意味着没声音，不该影响看图。浏览器的自动播放策略、
    // 地址 404、OSS 挂掉，全都静默降级在这里
    const started = el.play();
    if (started && typeof started.catch === "function") started.catch(() => {});
  };

  /**
   * 暂停 / 继续。
   *
   * 与 `stop()` 的区别很关键：`stop()` 会 `releaseElement()` **销毁**媒体元素，
   * 再播只能从头开始；这里只是 `element.pause()`，进度保留，resume 从原处接着放。
   * 详情弹窗左下角那个开关要的是后者。
   */
  const pause = () => {
    if (!element || paused.value) return;
    element.pause();
    paused.value = true;
  };

  const resume = () => {
    if (!element || !paused.value) return;
    paused.value = false;
    // 和 playSource 一样：起播失败只意味着没声音，静默降级
    const started = element.play();
    if (started && typeof started.catch === "function") started.catch(() => {});
  };

  const toggle = () => (paused.value ? resume() : pause());

  const play = (item) => {
    const source = resolveBgm(item);
    if (!source) return stop();
    playSource(source, item?.id ?? source.src);
  };

  // 对外对象同时也是「当前发声者」槽位里的把手：stop() 靠它判断自己是不是
  // 正占着那个槽位。`stop` / `playSource` 在源码顺序上先于它，但它们都在本函数
  // 返回之后才被调用，那时 api 已经就位
  const api = { activeBgm, activeId, paused, play, playSource, stop, pause, resume, toggle };
  return api;
}
