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

    <button
      class="drawer-toggle nav"
      type="button"
      aria-label="打开导航"
      :aria-expanded="openDrawer === 'nav'"
      @click="toggleDrawer('nav')"
    >
      ☰
    </button>

    <button
      class="drawer-toggle player"
      type="button"
      aria-label="打开音乐播放器"
      :aria-expanded="openDrawer === 'player'"
      @click="toggleDrawer('player')"
    >
      ♪
    </button>

    <div class="vf-container">
      <aside class="sidebar left" :class="{ 'is-open': openDrawer === 'nav' }">
        <nav class="vf-nav" @click="closeDrawer">
          <router-link to="/home" class="nav-link">Home</router-link>
          <router-link to="/profile" class="nav-link">Profile</router-link>
          <router-link to="/blog" class="nav-link">Blogs</router-link>
          <router-link to="/gallery" class="nav-link">Gallery</router-link>
          <router-link to="/about" class="nav-link">About</router-link>
          <!-- <router-link to="/tool" class="nav-link">Tools</router-link> -->
          <!-- <router-link to="/login" class="nav-link">Login</router-link> -->
        </nav>
      </aside>

      <main class="vf-main">
        <router-view class="page-content" />
      </main>

      <aside class="sidebar right" :class="{ 'is-open': openDrawer === 'player' }">
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

        <h3>Blogs</h3>
        <ul class="top-list">
          <li v-for="blog in latestBlogs" :key="blog.id">
            <router-link :to="`/blog/detail/${blog.id}`" class="top-link">{{ blog.title }}</router-link>
            <span class="top-summary">{{ blog.summary }}</span>
          </li>
        </ul>
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

    <div v-show="openDrawer" class="drawer-backdrop" @click="closeDrawer"></div>

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
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useDrawer } from "@/components/layout/useDrawer";
import { useLatestBlogs } from "@/modules/blog/composables/useLatestBlogs";
import { useAudioPlayer } from "@/modules/player/composables/useAudioPlayer";
import { getUserCount } from "@/modules/user/api/userApi";

const userCountEl = ref(null);
const route = useRoute();
const { openDrawer, closeDrawer, toggleDrawer } = useDrawer();
const { blogs: latestBlogs } = useLatestBlogs();
const { audioEl, playPauseBtn, prevBtn, nextBtn, progressBar, volumeSlider, trackName, volumeDisplay } = useAudioPlayer();

// 抽屉里点导航即跳转，跳转后必须收起，否则遮罩会留在新页面上。
// 点击当前路由的链接不会改变 fullPath，watch 不触发，因此收起同时挂在 .vf-nav 的 click 上
watch(() => route.fullPath, closeDrawer);

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
