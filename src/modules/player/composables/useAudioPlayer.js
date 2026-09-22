import { nextTick, onMounted, ref } from "vue";

import { getPlayerPlaylist } from "@/modules/player/api/playerApi";
import { getVolume, registerMediaElement, setVolume } from "@/modules/player/composables/mediaVolume";
import { playableTracks } from "@/modules/player/playlist";
import { formatTrackName } from "@/modules/player/trackName";

// =============================================================================
// 为详情弹窗的背景音乐让位
// =============================================================================
//
// 侧栏播放器和详情弹窗的 BGM 是两个音源，同时响会糊成一片。详情打开时让侧栏
// 暂停，关闭时还原 —— 但**只有它原本在播才还原**：用户本来就没放音乐，
// 关掉详情却突然响起侧栏的曲子，比不还原更糟。
//
// 状态放在模块级而不是 useAudioPlayer 的返回值里：播放器的内部状态全在 onMounted
// 的闭包中，外面拿不到那个 audio 元素。而全应用只有一个侧栏播放器实例，
// 模块级变量正好表达这件事（不新建 Pinia store —— 为一个暂停开关不值得）。

/** 侧栏的 audio 元素。由播放器在 onMounted 时登记，测试里也可以直接喂替身进来。 */
let playerAudio = null;

/** 让位之前它到底在不在播。只有 true 才恢复。 */
let wasPlayingBeforeBgm = false;

/**
 * 播放器挂载时把自己登记进来。
 *
 * 导出的目的是让「暂停/恢复」这一对有个明确的作用对象 —— 测试因此不必去真挂一个
 * DefaultLayout 才能断言这两个函数的行为。
 */
export function registerPlayerAudio(audio) {
  playerAudio = audio;
}

/**
 * 详情弹窗要播自己的 BGM，先让侧栏闭嘴。
 *
 * **必须是幂等的。** 同一段让位期间可能被叫停多次：Task 11 的 `playSource`
 * 换项时会再调一次，Task 13 的试听又是另一个实例。第二次调用时侧栏**正是被
 * 我们自己暂停的**，`audio.paused` 为真 —— 这一支**绝不能**去写
 * `wasPlayingBeforeBgm`。写了就把「原本在播」这个意图覆写成 false，
 * 关弹窗时 `resumeAfterBgm` 直接早返回，用户的歌**静默消失**且不会自己回来。
 *
 * 标志的写入责任是单一的：只有真正暂停的那一支置 `true`，
 * 只有 `resumeAfterBgm` 置 `false`。
 *
 * @returns 本次调用**是否真的接管了侧栏**。侧栏本来就没在播时为 `false` ——
 *          这时调用方没有开过让位窗口，也就无权去关它。多个 composable 实例
 *          共用这一个标志，所以「谁开的窗口谁关」必须靠这个返回值来区分。
 */
export function pauseForBgm() {
  const audio = playerAudio;
  if (!audio || audio.paused) return false;
  wasPlayingBeforeBgm = true;
  audio.pause();
  return true;
}

/** 详情弹窗关了，把侧栏还原成原来的样子 */
export function resumeAfterBgm() {
  const shouldResume = wasPlayingBeforeBgm;
  wasPlayingBeforeBgm = false;
  if (!shouldResume || !playerAudio) return;

  // play() 有两种不肯返回 Promise 的情况：jsdom 里它返回 undefined，
  // 浏览器里则可能因为自动播放策略被拒。两种都不能让异常冒出去 ——
  // 关弹窗这件事不该因为音频起播失败而出错
  const started = playerAudio.play();
  if (started && typeof started.catch === "function") started.catch(() => {});
}

/** 曲库为空时显示的中性文案。不是错误提示，只是陈述状态。 */
const EMPTY_LIBRARY_TEXT = "曲库未配置";

/**
 * 当前生效的曲目。
 *
 * 读失败时退成空列表、**不弹提示**：request.js 已经弹过一次，
 * 而且播放器是页面上的附加功能，它读不到歌不该再叠一条看着像整页出错的提示。
 */
async function loadConfiguredTracks() {
  try {
    const res = await getPlayerPlaylist();
    return playableTracks(res?.data);
  } catch {
    // 提示由 request.js 负责
    return [];
  }
}

export function useAudioPlayer() {
  const audioEl = ref(null);
  const playPauseBtn = ref(null);
  const prevBtn = ref(null);
  const nextBtn = ref(null);
  const progressBar = ref(null);
  const volumeSlider = ref(null);
  const trackName = ref(null);
  const volumeDisplay = ref(null);

  onMounted(async () => {
    await nextTick();
    const audio = audioEl.value;
    const playButton = playPauseBtn.value;
    const previousButton = prevBtn.value;
    const nextButton = nextBtn.value;
    const progress = progressBar.value;
    const volume = volumeSlider.value;
    const trackNameElement = trackName.value;
    const volumeDisplayElement = volumeDisplay.value;
    let shuffledPlaylist = [...(await loadConfiguredTracks())].sort(() => Math.random() - 0.5);
    let currentIndex = 0;

    // 把元素交给模块级的让位逻辑：详情弹窗打开时要靠它把侧栏暂停下来
    registerPlayerAudio(audio);
    // 音量不再是这里的一个常量：登记进全局音量层，它会立刻按当前音量写一次
    registerMediaElement(audio);

    // 播放/暂停按钮里的图标。这里只切 class、不写文本：原来是写 "▶" / "■"，
    // 这些几何字符在 iOS/Safari 上会被渲染成彩色 emoji
    const playIcon = playButton.querySelector(".ui-icon");
    const setPlayingIcon = (playing) => {
      if (!playIcon) return;
      playIcon.classList.toggle("ui-icon-pause", playing);
      playIcon.classList.toggle("ui-icon-play", !playing);
    };

    // 一首都没有时不能走 loadSong：下标会算出 NaN，取到 undefined，
    // formatTrackName 在它上面调 replace 直接抛。这里说明状态，但**不禁用按钮** ——
    // 空库时三个按钮是仅有的刷新入口，禁用就把「管理员把曲子加回来」的路堵死了。
    const applyEmptyLibrary = () => {
      // 卸掉源而不是只暂停：留着的话，管理员把配置清空又填回来的这段窗口里，
      // 点「播放」会放出元素上残着的那首旧曲 —— 而它已经不在新配置里了，
      // 曲名还写着「曲库未配置」，两边对不上。卸干净之后，下面那道
      // 「没有 src 就先装曲」的判据自然把这条路径也覆盖了
      audio.pause();
      audio.removeAttribute("src");
      // 只 removeAttribute 的话部分浏览器仍会留着已经缓冲好的资源，
      // load() 才是标准的「复位」动作
      audio.load();
      trackNameElement.textContent = EMPTY_LIBRARY_TEXT;
      progress.value = 0;
      setPlayingIcon(false);
    };

    const loadSong = (index) => {
      currentIndex = index;
      audio.src = `/music/${shuffledPlaylist[index]}`;
      trackNameElement.textContent = formatTrackName(shuffledPlaylist[index]);
      progress.value = 0;
      setPlayingIcon(false);
    };
    const playSong = () => {
      audio.play().catch((error) => console.warn("音频播放失败", error));
      setPlayingIcon(true);
    };
    const switchSong = (direction, autoPlay = false) => {
      // 空列表时 % 0 得到 NaN，后面拿它当下标会取到 undefined
      if (shuffledPlaylist.length === 0) return;
      currentIndex = (currentIndex + direction + shuffledPlaylist.length) % shuffledPlaylist.length;
      loadSong(currentIndex);
      if (autoPlay) playSong();
    };

    /**
     * 用新表替换当前这份。
     *
     * 正在放的那首如果还在新表里，就让它留在下标上 —— 否则下一次「下一曲」会从表头
     * 重来，听起来像跳了一张专辑。已经不在表里的（管理员刚把它从配置里去掉了）回到
     * 表头，但**不动音频元素**：那首歌还能自己放完，下一次切换自然落到新表上。
     */
    const applyPlaylist = (list) => {
      const playing = shuffledPlaylist[currentIndex];
      shuffledPlaylist = [...list].sort(() => Math.random() - 0.5);
      if (shuffledPlaylist.length === 0) {
        currentIndex = 0;
        applyEmptyLibrary();
        return;
      }
      const kept = shuffledPlaylist.indexOf(playing);
      currentIndex = kept === -1 ? 0 : kept;
    };

    /** 距上次拉取不足这么久就跳过。连点「下一曲」不该每次都打后端 */
    const PLAYLIST_REFRESH_INTERVAL = 30000;
    let lastPlaylistFetchAt = 0;

    /**
     * 重新拉一次曲目表，管理员改配置后已打开的页面不必刷新。
     *
     * 不走 loadConfiguredTracks()：它失败时返回 []，与「真的被清空了」分不开，
     * 一次网络抖动就会把正在放的曲目表清掉。这里自己 try，失败保留现状。
     */
    const refreshPlaylist = async () => {
      // 空库时不受间隔限制：那时三个按钮是唯一的刷新入口，用户点一次就该真的拉一次
      if (shuffledPlaylist.length > 0 && Date.now() - lastPlaylistFetchAt < PLAYLIST_REFRESH_INTERVAL) return;
      lastPlaylistFetchAt = Date.now();
      try {
        const res = await getPlayerPlaylist();
        applyPlaylist(playableTracks(res?.data));
      } catch {
        // 提示由 request.js 负责。一次拉取失败只意味着这次不更新，
        // 不能把当前正在放的曲目表清掉
      }
    };

    const updateProgress = () => {
      if (audio.duration && !Number.isNaN(audio.duration)) {
        progress.value = (audio.currentTime / audio.duration) * 100;
      }
    };
    const updateVolumeDisplay = () => {
      // 读全局音量而不是 audio.volume：提示音压低期间滑块不该跟着跳动
      const volumePercent = Math.round(getVolume() * 100);
      volumeDisplayElement.textContent = `Volume: ${volumePercent}%`;
      volume.valueAsNumber = volumePercent;
    };

    // 三个按钮都是用户点出来的，顺手校一次曲目表。`ended` 那条自动切歌不跟这一套。
    // 暂停那一支不拉：空库时它必然是暂停态，走的是下面那一支，不会漏掉刷新入口
    playButton.addEventListener("click", async () => {
      if (!audio.paused) {
        audio.pause();
        setPlayingIcon(false);
        return;
      }
      await refreshPlaylist();
      // 空库时这次点击只用来拉配置 —— 没有可放的曲子，别去碰 audio，
      // 否则 play() 会以一个 NotSupportedError 被拒并在控制台留下一条 warn
      if (shuffledPlaylist.length === 0) return;
      // 上一次是空库时音频从没装过 src（applyEmptyLibrary 不会去碰它）。
      // 光看列表长度不够：列表现在非空了，但元素还是空的，play() 照样会被拒
      if (!audio.getAttribute("src")) loadSong(currentIndex);
      playSong();
    });
    previousButton.addEventListener("click", async () => {
      await refreshPlaylist();
      switchSong(-1, true);
    });
    nextButton.addEventListener("click", async () => {
      await refreshPlaylist();
      switchSong(1, true);
    });
    audio.addEventListener("ended", () => switchSong(1, true));
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    progress.addEventListener("click", (event) => {
      if (!audio.duration) return;
      const rect = progress.getBoundingClientRect();
      audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
    });
    volume.addEventListener("input", (event) => {
      // 唯一的写入口。它会连同画廊的视频、BGM、首页主展示的视频一起改 ——
      // 那些元素各自登记过自己，这里不必知道它们是谁
      setVolume(event.target.valueAsNumber / 100);
      updateVolumeDisplay();
    });
    updateVolumeDisplay();
    if (shuffledPlaylist.length === 0) {
      applyEmptyLibrary();
      return;
    }
    loadSong(0);
  });

  return { audioEl, playPauseBtn, prevBtn, nextBtn, progressBar, volumeSlider, trackName, volumeDisplay };
}
