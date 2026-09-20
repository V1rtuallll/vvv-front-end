<template>
  <div class="vf-layout">
    <header class="vf-header">
      <!-- 背景扭曲滤镜的定义，只声明不渲染，供 CSS 的 filter: url(#header-warp) 引用。
           改 baseFrequency 调波纹疏密，改 scale 调扭曲幅度 -->
      <svg class="header-warp-defs" aria-hidden="true" focusable="false">
        <filter id="header-warp">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.028"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="16"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div class="header-background-custom"></div>
      <div class="header-overlay"></div>

      <div class="header-content">
        <!-- 背景水印：与标题同族、极细字重，纯装饰 -->
        <span class="header-watermark" aria-hidden="true">Virtual</span>

        <h1 class="vf-title">Virtual</h1>

        <!-- 标题正下方的一行小字 -->
        <p class="welcome-text neon-welcome">far in the blue sky...</p>

        <div class="freak-line neon-freak">
          人类数量:
          <span ref="userCountEl" class="counter-number">加载中... </span>
        </div>
        <div class="neon-marquee">
          <marquee behavior="scroll" direction="left" scrollamount="12">
            <span class="marquee-text">
              · V1rtual · · V1rtual · · V1rtual · · V1rtual · · V1rtual
              · · V1rtual · · V1rtual · · V1rtual · · V1rtual · ·
              V1rtual · · V1rtual · · V1rtual · · V1rtual · · V1rtual ·
              · V1rtual · · V1rtual · · V1rtual · · V1rtual · · V1rtual
              · · V1rtual ·
            </span>
          </marquee>
        </div>
      </div>
    </header>

    <!-- 头部与内容之间的导航条。做法取自 00 年代 Flash 站的技术面板：
         细线组分隔 + 斜纹底 + 大写大字距 tab，纯 CSS 画，不用任何外部素材 -->
    <div class="vf-navbar">
      <div class="vf-navbar-head">
        <span>▸ Global Navigator</span>
        <span>▸ V1rtual / {{ currentSection }}</span>
      </div>
      <nav class="vf-navbar-tabs" @click="closeDrawer">
        <router-link to="/home" class="vf-tab">Home</router-link>
        <router-link to="/profile" class="vf-tab">Profile</router-link>
        <router-link to="/blog" class="vf-tab">Blogs</router-link>
        <router-link to="/gallery" class="vf-tab">Gallery</router-link>
        <router-link to="/about" class="vf-tab">About</router-link>
      </nav>
    </div>

    <button
      class="drawer-toggle player"
      type="button"
      aria-label="打开音乐播放器"
      :aria-expanded="openDrawer === 'player'"
      @click="toggleDrawer('player')"
    >
      <span class="ui-icon ui-icon-menu"></span>
    </button>

    <div class="vf-container">
      <main class="vf-main">
        <router-view class="page-content" />
      </main>

      <aside class="sidebar right" :class="{ 'is-open': openDrawer === 'player' }">
        <!-- 当前登录用户的 ID 卡。放在最前：先看到「我是谁」，再是曲库与列表 -->
        <!-- 当前登录用户的 ID 卡。
             未登录时**卡片大小不变** —— 只把头像换成空框、内容换成登录/注册入口，
             否则整条侧栏的高度会随登录状态跳一下。
             配色与上面的列表同一套（白底、灰蓝描边、藕荷徽章） -->
        <div class="id-card">
          <div class="id-card-head">▸ Account</div>

          <div class="id-card-body">
            <img
              v-if="authStore.isLoggedIn"
              class="id-card-avatar"
              :src="authStore.user?.avatar || '/default-avatar.gif'"
              :alt="authStore.user?.username || '头像'"
            />
            <span v-else class="id-card-avatar id-card-avatar-empty" aria-hidden="true"></span>

            <div class="id-card-text">
              <template v-if="authStore.isLoggedIn">
                <span class="id-card-name">{{ authStore.user?.username }}</span>
                <span class="id-card-no"
                  >ID #{{ String(authStore.user?.id ?? 0).padStart(3, "0") }}</span
                >
              </template>
              <template v-else>
                <span class="id-card-name">未登录</span>
                <span class="id-card-actions">
                  <router-link to="/login" class="id-card-btn">登录</router-link>
                  <router-link to="/register" class="id-card-btn">注册</router-link>
                </span>
              </template>
            </div>
          </div>

          <!-- 明细：与 profile 页展示的字段保持一致（性别 / 注册时间 / 签名）。
               未登录时不渲染，但卡体已经是固定高度，整体不会跳 -->
          <dl v-if="authStore.isLoggedIn" class="id-card-fields">
            <dt>性别</dt>
            <dd>{{ displayGender(authStore.user?.sex) }}</dd>
            <dt>注册</dt>
            <dd>{{ formatDate(authStore.user) }}</dd>
            <dt>签名</dt>
            <dd class="id-card-desc">
              {{ authStore.user?.description || "未设置" }}
            </dd>
          </dl>

          <!-- 战绩格：四个数由后端一条 SQL 出全（GET /user/stats），
               不拆成四个请求。未登录时不渲染，卡体已有固定尺寸不会跳 -->
          <div v-if="authStore.isLoggedIn" class="id-card-stats">
            <div class="id-card-stat">
              <span class="id-card-stat-num">{{ userStats.galleryCount }}</span>
              <span class="id-card-stat-label">画廊</span>
            </div>
            <div class="id-card-stat">
              <span class="id-card-stat-num">{{ userStats.galleryLikes }}</span>
              <span class="id-card-stat-label">获赞</span>
            </div>
            <div class="id-card-stat">
              <span class="id-card-stat-num">{{ userStats.blogCount }}</span>
              <span class="id-card-stat-label">文章</span>
            </div>
            <div class="id-card-stat">
              <span class="id-card-stat-num">{{ userStats.blogViews }}</span>
              <span class="id-card-stat-label">阅读</span>
            </div>
          </div>
        </div>

        <!-- 音频模块。结构照 00 年代 Flash 站的音频面板：信息条 + 显示区 + 方块按钮排。
             8 个 ref 一个都不能少，useAudioPlayer 在 onMounted 里直接取它们的属性 -->
        <div class="music-player">
          <div class="mp-head">
            <span>▸ Audio</span>
            <span>▸ Now Playing</span>
          </div>

          <div class="mp-display">
            <span ref="trackName" class="track-name">Loading...</span>
            <progress ref="progressBar" value="0" max="100"></progress>
          </div>

          <!-- 装饰波浪条：取自 stickers/loop1.gif 首帧，逆时针转 90° 后横向拉伸 -->
          <div class="mp-wave" aria-hidden="true"></div>

          <div class="player-controls">
            <button ref="prevBtn" type="button" aria-label="上一首">◀◀</button>
            <button ref="playPauseBtn" type="button" aria-label="播放或暂停">▶</button>
            <button ref="nextBtn" type="button" aria-label="下一首">▶▶</button>
          </div>

          <div class="volume-control">
            <input
              type="range"
              ref="volumeSlider"
              min="0"
              max="100"
              value="50"
              step="1"
              aria-label="音量"
            />
            <div ref="volumeDisplay" class="volume-display">Volume: 50%</div>
          </div>

          <audio ref="audioEl" preload="auto"></audio>
        </div>

        <h3>Blogs</h3>
        <ul class="top-list">
          <li v-for="blog in latestBlogs" :key="blog.id">
            <!-- 整行都是链接：封面也放在链接内部，否则点封面不会跳转。
                 没有封面的文章用点阵方块占位，保证每行左边对齐 -->
            <router-link :to="`/blog/detail/${blog.id}`" class="top-link">
              <img
                v-if="blog.coverImage"
                class="top-cover"
                :src="blog.coverImage"
                :alt="blog.title"
              />
              <span v-else class="top-cover top-cover-empty" aria-hidden="true"></span>
              <span class="top-link-text">
                {{ blog.title }}
                <span class="top-summary">{{ blog.summary }}</span>
              </span>
              <!-- 右列：编号 + 阅读/评论。与下面的画廊列表同一套 -->
              <span class="top-side">
                <span class="top-id"
                  >ID #{{ String(blog.id).padStart(3, "0") }}</span
                >
                <span class="top-stats">
                  <span class="ui-icon ui-icon-eye"></span>
                  {{ blog.views || 0 }}
                  <span class="ui-icon ui-icon-comment"></span>
                  {{ blog.commentCount || 0 }}
                </span>
              </span>
            </router-link>
          </li>
        </ul>
        <h3>Gallery</h3>
        <!-- 一行一条：左侧带框缩略图 + 右侧标题/类型，行尾挂编号。
             版式取自 00 年代 Flash 站的展示条目（缩略图带细框、微字号大写、右侧编号） -->
        <ul class="gallery-rows">
          <li v-for="item in latestGallery" :key="item.id">
            <router-link
              class="gallery-row"
              :to="{ path: '/gallery', query: { id: item.id } }"
            >
              <span class="gallery-row-thumb">
                <img
                  v-if="isImage(item)"
                  :src="item.src"
                  :alt="item.title || '画廊'"
                />
                <!-- 视频没有独立的缩略图（thumbnail 列从不写入），放 video 元素让浏览器显示首帧 -->
                <video
                  v-else-if="item.type === 'video'"
                  :src="item.src"
                  :aria-label="item.title || '画廊视频'"
                  muted
                  preload="metadata"
                ></video>
                <span v-else class="gallery-type" aria-hidden="true">
                  <span class="ui-icon ui-icon-music"></span>
                </span>
              </span>
              <span class="gallery-row-text">
                <span class="gallery-row-name">{{
                  item.title || "未命名"
                }}</span>
                <span class="gallery-row-type">{{ item.type }}</span>
              </span>
              <!-- 右列：编号在上、小统计在下。
                   侧栏只有 246px，把统计塞进中间那列会被挤爆（实测差 18px），
                   右列本来就有竖向空间，挂这儿正好 -->
              <span class="gallery-row-side">
                <span class="gallery-row-id"
                  >ID #{{ String(item.id).padStart(3, "0") }}</span
                >
                <span class="gallery-row-stats">
                  <span class="ui-icon ui-icon-heart"></span>
                  {{ item.likes || 0 }}
                  <span class="ui-icon ui-icon-comment"></span>
                  {{ item.commentCount || 0 }}
                </span>
              </span>
            </router-link>
          </li>
        </ul>

      </aside>
    </div>

    <div v-show="openDrawer" class="drawer-backdrop" @click="closeDrawer"></div>

    <!-- 页脚：备案号居中，右下角一行站点签句 -->
    <footer class="neon-footer">
      <div class="filing-footer">
        <a
          class="filing-link"
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
        >
          黔ICP备2025051637号-2
        </a>
        <p class="footer-signoff">Do you know everything, sky?</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useAuthStore } from "@/stores/auth";
import { formatDate } from "@/utils/DateUtil";
import { displayGender } from "@/utils/gender";
import { useDrawer } from "@/components/layout/useDrawer";
import { useLatestBlogs } from "@/modules/blog/composables/useLatestBlogs";
import { useLatestGallery } from "@/modules/gallery/composables/useLatestGallery";
import { useAudioPlayer } from "@/modules/player/composables/useAudioPlayer";
import { getUserCount, getUserStats } from "@/modules/user/api/userApi";

const userCountEl = ref(null);
const route = useRoute();
// 导航条右侧显示当前栏目名，取路径第一段（/gallery/detail/3 → gallery）
const currentSection = computed(() => route.path.split("/")[1] || "home");
const authStore = useAuthStore();

/** ID 卡的战绩。未登录或请求失败时保持全 0，卡片显示 0 而不是空白 */
const userStats = ref({ galleryCount: 0, galleryLikes: 0, blogCount: 0, blogViews: 0 });

const loadUserStats = async () => {
  if (!authStore.isLoggedIn) {
    userStats.value = { galleryCount: 0, galleryLikes: 0, blogCount: 0, blogViews: 0 };
    return;
  }
  try {
    const res = await getUserStats();
    userStats.value = { ...userStats.value, ...(res.data || {}) };
  } catch (error) {
    // 失败提示由 request.js 统一负责，这里只保证卡片不空着
    console.error("获取用户战绩失败:", error);
  }
};

// 登录状态会变（登录/登出都在这一个布局里发生），跟着重新拉
watch(() => authStore.isLoggedIn, loadUserStats);
const { openDrawer, closeDrawer, toggleDrawer } = useDrawer();
const { blogs: latestBlogs } = useLatestBlogs();
const { items: latestGallery } = useLatestGallery();

// 画廊列表混合了图片、视频与音乐，只有前两种能直接当缩略图用
const isImage = (item) => item.type === "photo" || item.type === "gif";
const { audioEl, playPauseBtn, prevBtn, nextBtn, progressBar, volumeSlider, trackName, volumeDisplay } = useAudioPlayer();

// 抽屉里点导航即跳转，跳转后必须收起，否则遮罩会留在新页面上。
// 点击当前路由的链接不会改变 fullPath，watch 不触发，因此收起同时挂在 .vf-nav 的 click 上
watch(() => route.fullPath, closeDrawer);

onMounted(async () => {
  loadUserStats();
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
