<template>
  <div class="vf-layout">
    <header class="vf-header">
      <div class="header-background-custom"></div>
      <div class="header-overlay"></div>

      <div class="header-content">
        <h1 class="vf-title glitch-title">✞ V1rtual ✞</h1>
        <div class="freak-line neon-freak">
          （若加载不出 刷新即可） 人类数量:
          <span ref="userCountEl" class="counter-number">加载中... </span>
        </div>
        <p class="welcome-text neon-welcome">🖤 Welcome to my imagination 🖤</p>
        <div class="neon-marquee">
          <marquee behavior="scroll" direction="left" scrollamount="12">
            <span class="marquee-text">
              ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual
              ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨
              V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨
              ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual
              ✨ ✨ V1rtual ✨
            </span>
          </marquee>
        </div>
      </div>
    </header>

    <div class="vf-container">
      <aside class="sidebar left">
        <nav class="vf-nav">
          <router-link to="/home" class="nav-link">Home</router-link>
          <router-link to="/profile" class="nav-link">Profile</router-link>
          <!-- <router-link to="/blog" class="nav-link">Blogs</router-link> -->
          <router-link to="/gallery" class="nav-link">Gallery</router-link>
          <!-- <router-link to="/tool" class="nav-link">Tools</router-link> -->
          <!-- <router-link to="/login" class="nav-link">Login</router-link> -->
        </nav>
      </aside>

      <main class="vf-main">
        <router-view class="page-content" />
      </main>

      <aside class="sidebar right">
        <div class="music-player">
          <h3>Now Playing</h3>
          <span ref="trackName" class="track-name">Loading...</span>

          <progress ref="progressBar" value="0" max="100"></progress>

          <div class="player-controls">
            <button ref="playPauseBtn">▶</button>

            <div class="prev-next-controls">
              <button ref="prevBtn">◀◀</button>
              <button ref="nextBtn">▶▶</button>
            </div>

            <div class="volume-control">
              <input
                type="range"
                ref="volumeSlider"
                min="0"
                max="100"
                value="50"
                step="1"
              />
              <div ref="volumeDisplay" class="volume-display">Volume: 50%</div>
            </div>
          </div>

          <audio ref="audioEl" preload="auto"></audio>
        </div>

        <!-- <h3>Blogs</h3>
        <ul class="top-list">
          <li>1. DarkAngel</li>
          <li>2. BloodRose</li>
        </ul> -->
        <h3>Imgs</h3>
        <div class="friends-grid">
          <img src="/stickers/skull1.gif" alt="sticker" />
          <img src="/stickers/heart2.gif" alt="sticker" />
          <img src="/stickers/green_stars.gif" alt="sticker" />
        </div>
        <br />
        <span>我称此为，原初之地版本。</span>
      </aside>
    </div>

    <footer class="neon-footer">
      <div class="footer-marquee-container">
        <div class="footer-marquee-text">
          ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨
          ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨
          ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨
          ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨
        </div>
      </div>
      <div class="filing-footer">
        <a
          class="filing-link"
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
        >
          黔ICP备2025051637号-2
        </a>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useAudioPlayer } from "@/modules/player/composables/useAudioPlayer";
import { getUserCount } from "@/modules/user/api/userApi";

const userCountEl = ref(null);
const { audioEl, playPauseBtn, prevBtn, nextBtn, progressBar, volumeSlider, trackName, volumeDisplay } = useAudioPlayer();

onMounted(async () => {
  try {
    const res = await getUserCount();
    if (userCountEl.value) userCountEl.value.textContent = res.data;
  } catch (error) {
    console.error("获取人数失败:", error);
    if (userCountEl.value) userCountEl.value.textContent = "???";
  }
});
</script>
<style src="./DefaultLayout.css" scoped></style>
