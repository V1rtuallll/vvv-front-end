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
const globalSounds = ref([]); // 全局9个音效
let currentPlayingSound = null; // 当前正在播放的音效（用于停止上一个）
const getMusicAudio = () => document.querySelector(".music-player audio"); // 实时获取音乐播放器audio

/**
 * 音效把背景音乐压低**之前**的音量；`null` 表示当前没有处于压低状态。
 *
 * 这个值必须只在**第一次**压低时记下来，不能在每次响音效时重新读：
 * `pause()` 打断上一个音效**不会**触发它的 `onended`，那时音量还停在压低值上，
 * 若此刻重新读一次「原音量」，读到的就是压低后的值，音乐之后只会恢复到那个值 ——
 * 连着来两条提示，背景音乐就永久停在 10%，要刷新页面才回来。
 */
let volumeBeforeDuck = null;

const setGlobalSound = (el, index) => {
  if (el) globalSounds.value[index] = el;
};

/** 需要时把背景音乐压低，并记住压低前的音量 */
const duckMusicVolume = () => {
  const musicAudio = getMusicAudio();
  if (!musicAudio || musicAudio.paused) return;
  // 已经压着了就不再记一次。这一句是这段的全部要害：响一连串音效时，
  // 上一个音效是被 pause() 打断的（onended 不触发、音量还停在压低值上），
  // 此刻重新读一次「当前音量」，读到的就是压低后的值。
  if (volumeBeforeDuck !== null) return;
  volumeBeforeDuck = musicAudio.volume;
  smoothVolumeChange(musicAudio, 0.1, 300);
};

/** 把背景音乐恢复到压低前的音量 */
const restoreMusicVolume = () => {
  if (volumeBeforeDuck === null) return;
  const target = volumeBeforeDuck;
  volumeBeforeDuck = null;
  const musicAudio = getMusicAudio();
  if (musicAudio && !musicAudio.paused) {
    smoothVolumeChange(musicAudio, target, 500);
  }
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
// 平滑音量变化函数（改成传audio和目标音量）
const smoothVolumeChange = (audioEl, targetVolume, duration = 300) => {
  if (!audioEl) return;

  const startVolume = audioEl.volume;
  const startTime = performance.now();

  const animate = (time) => {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    audioEl.volume = startVolume + (targetVolume - startVolume) * ease;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);
};
// 全局解锁（只解一次）
onMounted(() => {
  const unlock = () => {
    globalSounds.value.forEach((audio) => {
      if (audio) {
        audio.muted = false;
        // 强制播放一次空音彻底解锁
        audio
          .play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
          })
          .catch(() => {});
      }
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
