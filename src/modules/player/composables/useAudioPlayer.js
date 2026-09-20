import { nextTick, onMounted, ref } from "vue";

const playlist = [
  "3tries - In My Restless Dreams.mp3",
  "aak3 - dissociated.mp3",
  "aak3 _ Softboy7 - false promises (feat_ Softboy7).mp3",
  "CactusTeam _ MixAndMash - flutterbies (feat_ MixAndMash).mp3",
  "Exodia - 825 hp.mp3",
  "Glitchtrode _ pLasterbrain - Nimbasa CORE (glitchtrode Remix).mp3",
  "Iwakura - farlands.mp3",
  "Iwakura - Hatred.mp3",
  "Iwakura - ∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰.mp3",
  "musicarchives_mp3 _ Sewerslvt - Ryona (feat_ Sewerslvt).mp3",
  "musicarchives_mp3 _ Yabujin - gnome - ✞ (swineantarctica) (feat_ Yabujin).mp3",
  "Nuvfr - Pink flame.mp3",
  "RFM Beats - 3 minute.mp3",
  "Sewerslvt - Lexapro Delirium.mp3",
  "Sewerslvt - Mr_ Kill Myself.mp3",
  "Sewerslvt - Swinging in His Cell (Explicit).mp3",
];

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
    const shuffledPlaylist = [...playlist].sort(() => Math.random() - 0.5);
    let currentIndex = 0;

    // 把元素交给模块级的让位逻辑：详情弹窗打开时要靠它把侧栏暂停下来
    registerPlayerAudio(audio);
    audio.volume = 0.3;
    const formatTrackName = (filename) => {
      const name = filename.replace(".mp3", "");
      const dashIndex = name.lastIndexOf(" - ");
      return dashIndex !== -1 ? name.substring(dashIndex + 3).trim() : name.replace(/_/g, " ").trim();
    };
    const loadSong = (index) => {
      currentIndex = index;
      audio.src = `/music/${shuffledPlaylist[index]}`;
      trackNameElement.textContent = formatTrackName(shuffledPlaylist[index]);
      progress.value = 0;
      playButton.textContent = "▶";
    };
    const playSong = () => {
      audio.play().catch((error) => console.warn("音频播放失败", error));
      playButton.textContent = "■";
    };
    const switchSong = (direction, autoPlay = false) => {
      currentIndex = (currentIndex + direction + shuffledPlaylist.length) % shuffledPlaylist.length;
      loadSong(currentIndex);
      if (autoPlay) playSong();
    };
    const updateProgress = () => {
      if (audio.duration && !Number.isNaN(audio.duration)) {
        progress.value = (audio.currentTime / audio.duration) * 100;
      }
    };
    const updateVolumeDisplay = () => {
      const volumePercent = Math.round(audio.volume * 100);
      volumeDisplayElement.textContent = `Volume: ${volumePercent}%`;
      volume.valueAsNumber = volumePercent;
    };

    playButton.addEventListener("click", () => {
      if (audio.paused) playSong();
      else {
        audio.pause();
        playButton.textContent = "▶";
      }
    });
    previousButton.addEventListener("click", () => switchSong(-1, true));
    nextButton.addEventListener("click", () => switchSong(1, true));
    audio.addEventListener("ended", () => switchSong(1, true));
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    progress.addEventListener("click", (event) => {
      if (!audio.duration) return;
      const rect = progress.getBoundingClientRect();
      audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
    });
    volume.addEventListener("input", (event) => {
      audio.volume = Math.max(0, Math.min(1, event.target.valueAsNumber / 100));
      updateVolumeDisplay();
    });
    updateVolumeDisplay();
    loadSong(0);
  });

  return { audioEl, playPauseBtn, prevBtn, nextBtn, progressBar, volumeSlider, trackName, volumeDisplay };
}
