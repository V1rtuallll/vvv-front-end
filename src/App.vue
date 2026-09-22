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
import {
  DUCK_FACTOR,
  clearDucked,
  getVolume,
  markDucked,
} from "@/modules/player/composables/mediaVolume";
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
 * 当前正被压低的那几个元素。只记「谁」，不记「压低之前是多少」。
 *
 * 还原的目标读全局音量层就对了 —— 存一份值反而会失配：全局音量之后，压低期间
 * 用户照样能拖滑块，写回那个过时的快照会让滑块显示的与实际出声的永久对不上，
 * 只能刷新页面恢复。原来那张「元素 → 值」的表还要两路音源各记各的，现在两路
 * 本来就共用同一个音量，集合就够了。
 */
const duckedElements = new Set();

/**
 * 元素 → 它身上正在跑的音量动画帧。开新动画前先把旧的取消：
 * 压低与还原撞在一起时，两轮 rAF 会同时往 volume 上写，谁也到不了自己的目标值。
 */
const volumeAnimations = new Map();

const setGlobalSound = (el, index) => {
  if (el) globalSounds.value[index] = el;
};

/** 需要时把正在响的音源压低 */
const duckMusicVolume = () => {
  getDuckTargets().forEach((target) => {
    // 没在播的不碰、也不记：写音量会让它下次出声时莫名其妙地变轻
    if (target.paused) return;
    // 已经压着了就不再压一次
    if (duckedElements.has(target)) return;
    duckedElements.add(target);
    markDucked(target);
    smoothVolumeChange(target, getVolume() * DUCK_FACTOR, 300);
  });
};

/** 把正在响的音源恢复到全局音量 */
const restoreMusicVolume = () => {
  duckedElements.forEach((target) => {
    // 压低期间被停掉的不再还原（用户按了暂停、关掉了带 BGM 的弹窗）：
    // 不写没在播的元素，记录也就此作废
    if (target.paused) {
      duckedElements.delete(target);
      clearDucked(target);
      return;
    }
    // 先从这个名单里划掉：还原动画跑着的时候它已经不算「压着」了，
    // 这半秒里再来一个音效必须能把它重新压下去 —— 音乐正在往回升，
    // 提示音盖不住它
    duckedElements.delete(target);
    // 还原到**实时**音量：压低期间用户可能拖过滑块，
    // 回到「压低之前记下的那个值」会让滑块与实际出声永久失配
    smoothVolumeChange(target, getVolume(), 500, () => clearDucked(target));
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
