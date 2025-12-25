<template>
  <router-view />
  <audio
    v-for="n in 9"
    :key="n"
    :ref="(el) => setGlobalSound(el, n - 1)"
    preload="auto"
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
let isSoundEffectPlaying = false; // 标记是否有音效在播放

const setGlobalSound = (el, index) => {
  if (el) globalSounds.value[index] = el;
};

// 全局随机播放
window.playGlobalRandomSound = () => {
  if (globalSounds.value.length < 9) return;
  // 停止上一个音效
  if (currentPlayingSound) {
    currentPlayingSound.pause();
    currentPlayingSound.currentTime = 0;
  }
  const randomIndex = Math.floor(Math.random() * 9);
  const audio = globalSounds.value[randomIndex];
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {
      console.log("Audio play failed");
    });
  }
  const musicAudio = getMusicAudio();
  let originalVolume = 0.3; // 默认兜底
  if (musicAudio && !musicAudio.paused) {
    originalVolume = musicAudio.volume; // 实时取当前音量
    smoothVolumeChange(musicAudio, 0.1, 300); // 降到5%
  }
  isSoundEffectPlaying = true;
  audio.play().catch(() => {});
  currentPlayingSound = audio;
  // 音效结束恢复原音量
  audio.onended = () => {
    isSoundEffectPlaying = false;
    if (musicAudio && !musicAudio.paused) {
      smoothVolumeChange(musicAudio, originalVolume, 500);
    }
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
