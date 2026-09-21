<template>
  <router-view />
  <!--
    preload 用 none：9 个音效合计约 1.1MB，用 auto 会在首屏就把它们全部下载。
    首次点击/touch/keydown 的解锁逻辑会主动 play() 一次，那时才开始加载，
    提示音本来就是交互之后才会响，所以不影响可用性。
  -->
  <audio
    v-for="n in 9"
    :key="n"
    :ref="(el) => setGlobalSound(el, n - 1)"
    preload="none"
  >
    <source :src="`/music/sounds/sound-${n}.MP3`" type="audio/mpeg" />
  </audio>
  <VMessage />
</template>
<script setup>
import { ref, onMounted } from "vue";
import VMessage from "@/components/VMessage.vue";
import { getActiveBgmElement } from "@/modules/gallery/composables/useGalleryBgm";
const globalSounds = ref([]); // 全局9个音效
let currentPlayingSound = null; // 当前正在播放的音效（用于停止上一个）
const getMusicAudio = () => document.querySelector(".music-player audio"); // 实时获取音乐播放器audio

/**
 * 响音效时要让路的两路音源：侧栏播放器与画廊 BGM。
 *
 * 两路都得**现取**：侧栏元素由布局挂载时才有，画廊元素由详情弹窗起播时现建，
 * App 挂载时一个都不存在。画廊那一个是用 document.createElement 建的、
 * 从不进 DOM，选择器查不到，只能由 useGalleryBgm 交出来。
 */
const getDuckTargets = () => {
  const targets = [];
  const musicAudio = getMusicAudio();
  if (musicAudio) targets.push(musicAudio);
  const bgmElement = getActiveBgmElement();
  if (bgmElement) targets.push(bgmElement);
  return targets;
};

/**
 * 元素 → 它被压低**之前**的音量。不在表里表示这个元素当前没有被压低。
 *
 * 两路音源各记各的：它们的音量互相独立（侧栏是 0.3，画廊 BGM 按源文件音量），
 * 共用一个槽位的话，先还原的那一路会用到另一路的值。
 *
 * 值必须只在**第一次**压低时记下来，不能在每次响音效时重新读：
 * `pause()` 打断上一个音效**不会**触发它的 `onended`，那时音量还停在压低值上，
 * 若此刻重新读一次「原音量」，读到的就是压低后的值，音乐之后只会恢复到那个值 ——
 * 连着来两条提示，背景音乐就永久停在 10%，要刷新页面才回来。
 *
 * 记录留到**还原动画走完**才作废（见 smoothVolumeChange 的 onSettled）：还原的
 * 半路上再响一个音效，读到的同样是动画中途的音量，音乐每响一次就轻一点。
 */
const volumeBeforeDuck = new Map();

/**
 * 元素 → 它身上正在跑的音量动画帧。开新动画前先把旧的取消：
 * 压低与还原撞在一起时，两轮 rAF 会同时往 volume 上写，谁也到不了自己的目标值。
 */
const volumeAnimations = new Map();

const setGlobalSound = (el, index) => {
  if (el) globalSounds.value[index] = el;
};

/** 需要时把正在响的音源压低，并记住压低前的音量 */
const duckMusicVolume = () => {
  getDuckTargets().forEach((target) => {
    // 没在播的不碰、也不记：写音量会让它下次出声时莫名其妙地变轻
    if (target.paused) return;
    // 已经压着了（或正在还原）就不再记一次。这一句是这段的全部要害：
    // 响一连串音效时，上一个音效是被 pause() 打断的（onended 不触发、
    // 音量还停在压低值上），此刻重新读一次「当前音量」，读到的就是压低后的值。
    if (!volumeBeforeDuck.has(target)) {
      volumeBeforeDuck.set(target, target.volume);
    }
    smoothVolumeChange(target, 0.1, 300);
  });
};

/** 把正在响的音源恢复到压低前的音量 */
const restoreMusicVolume = () => {
  volumeBeforeDuck.forEach((preDuckVolume, target) => {
    // 压低期间被停掉的不再还原（用户按了暂停、关掉了带 BGM 的弹窗）：
    // 不写没在播的元素，记录也就此作废
    if (target.paused) {
      volumeBeforeDuck.delete(target);
      return;
    }
    smoothVolumeChange(target, preDuckVolume, 500, () => {
      // 还原动画真的走完才作废记录：半路上又响一个音效时，它读到的必须是
      // 压低之前的音量，而不是动画中途的音量
      if (volumeBeforeDuck.get(target) === preDuckVolume) {
        volumeBeforeDuck.delete(target);
      }
    });
  });
};

// 全局随机播放
window.playGlobalRandomSound = () => {
  if (globalSounds.value.length < 9) return;

  // 停止上一个音效。这里刻意**不**还原音量：一连串音效中间冒出来的那次还原
  // 会和紧接着的压低连成一串升降，用户听到的是音量一鼓一鼓的。
  // 音量统一由最后那个音效的 onended 还原 —— 它一定会被设上。
  if (currentPlayingSound) {
    currentPlayingSound.pause();
    currentPlayingSound.currentTime = 0;
  }

  const randomIndex = Math.floor(Math.random() * 9);
  const audio = globalSounds.value[randomIndex];
  // 元素没挂上时直接不响。以前这一支会继续往下走，在下面那次 play() 上抛异常
  if (!audio) return;

  audio.currentTime = 0;
  audio.volume = 1.0;
  audio.play().catch(() => {
    console.log("Audio play failed");
  });

  duckMusicVolume();

  currentPlayingSound = audio;
  // 音效播完，还原音量
  audio.onended = () => {
    restoreMusicVolume();
    currentPlayingSound = null;
  };
};
/**
 * 平滑音量变化函数（改成传audio和目标音量）
 *
 * `onSettled` 在动画真正走完时回调一次：压低的记录要留到那一刻才能删。
 */
const smoothVolumeChange = (audioEl, targetVolume, duration = 300, onSettled) => {
  if (!audioEl) return;

  // 同一元素上的旧动画先取消：不取消的话，还原还没走完又压低时，
  // 两轮 rAF 会各自往 volume 上写，动画结束时停在谁的目标值上是不确定的
  const running = volumeAnimations.get(audioEl);
  if (running) cancelAnimationFrame(running);

  const startVolume = audioEl.volume;
  const startTime = performance.now();

  const animate = (time) => {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    audioEl.volume = startVolume + (targetVolume - startVolume) * ease;

    if (progress < 1) {
      volumeAnimations.set(audioEl, requestAnimationFrame(animate));
      return;
    }
    volumeAnimations.delete(audioEl);
    if (onSettled) onSettled();
  };
  volumeAnimations.set(audioEl, requestAnimationFrame(animate));
};
// 全局解锁（只解一次）
onMounted(() => {
  /**
   * 解锁一个音效元素。
   *
   * 解锁必须真的 play() 一次（自动播放策略要的就是这次调用），但这些元素是
   * `preload="none"`，play() 会先出声、再等 Promise 回调里的 pause() 才停 ——
   * 用户听到的是一小段**与 vmessage 提示音完全相同**的音效，却没有任何提示框，
   * 于是报「有提示音但没有提示」。所以解锁全程静音。
   *
   * 静音只是解锁时的手段，不是最终状态：结束时必须还原，否则之后的音效全哑。
   */
  const unlockSound = (audio) => {
    audio.muted = true;
    const started = audio.play();
    const finish = () => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    };
    // 老浏览器与 jsdom 里 play() 不返回 Promise，那种情况只能立刻暂停 ——
    // 这也是最早的 iOS 解锁写法
    if (started && typeof started.then === "function") {
      started.then(finish).catch(() => {
        audio.muted = false;
      });
    } else {
      finish();
    }
  };

  const unlock = () => {
    globalSounds.value.forEach((audio) => {
      if (audio) unlockSound(audio);
    });
    document.removeEventListener("click", unlock);
    document.removeEventListener("touchstart", unlock);
    document.removeEventListener("keydown", unlock);
  };

  document.addEventListener("click", unlock);
  document.addEventListener("touchstart", unlock);
  document.addEventListener("keydown", unlock);
});
</script>
<style scoped></style>
