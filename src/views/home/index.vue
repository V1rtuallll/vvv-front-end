<template>
  <div class="home-wrapper">
    <!-- 大展示容器（加动态 padding-bottom） -->
    <div
      class="main-showcase"
      :class="{ 'show-info': showInfo }"
      @mouseenter="showInfo = true"
      @mouseleave="showInfo = false"
    >
      <!-- 视频/图片 -->
      <transition name="fade">
        <div v-if="mainItem" class="showcase-media-wrapper">
          <video
            v-if="mainItem.type === 'video'"
            :src="mainItem.src"
            autoplay
            loop
            playsinline
            controls
            class="showcase-media"
          />
          <img
            v-else
            :src="mainItem.src"
            :alt="mainItem.alt"
            class="showcase-media"
          />
        </div>
      </transition>

      <!-- 底部弹出栏：左上传信息 + 右标题描述 -->
      <transition name="slide-down">
        <div v-if="showInfo && mainItem" class="showcase-info-bottom">
          <div class="info-container">
            <!-- 左半边：上传人信息 -->
            <div class="uploader-left">
              <img
                :src="mainItem.uploaderAvatar || '/default-avatar.gif'"
                alt="上传者头像"
                class="uploader-avatar"
              />
              <div class="uploader-text">
                <span class="uploader-name"
                  >@{{ mainItem.uploaderUsername || "V1rtual" }}</span
                >
                <span class="upload-time">{{
                  mainItem.uploadTime || "刚刚上传"
                }}</span>
              </div>
            </div>

            <!-- 右半边：标题 + 描述 -->
            <div class="content-right">
              <h2 class="showcase-title ellipsis">
                {{ mainItem.title || "V1rtual 的月光时刻" }}
              </h2>
              <p class="showcase-desc ellipsis">
                {{ mainItem.description || mainItem.alt }}
              </p>

              <!-- 换一个按钮（只在随机模式显示） -->
              <button
                v-if="mainItem.random === 1 || mainItem.random === true"
                @click="changeRandom"
                class="change-btn"
              >
                换一个
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 2. 图片拼图（瀑布流，支持视频/GIF/图片混排） -->
    <div class="gallery-masonry">
      <div
        class="masonry-item"
        v-for="(item, index) in galleryItems"
        :key="index"
        :style="{ height: item.height + 'px' }"
      >
        <video
          v-if="item.type === 'video'"
          :src="item.src"
          autoplay
          loop
          playsinline
          class="masonry-media"
        />
        <img v-else :src="item.src" :alt="item.alt" class="masonry-media" />
        <div class="masonry-overlay">
          <span class="overlay-text">{{ item.alt || "未命名" }}</span>
        </div>
      </div>
    </div>

    <!-- 3. Blog 区域：左最新 + 右置顶 -->
    <div class="blogs-container">
      <!-- 左：最新 Blog -->
      <div class="latest-blogs">
        <h3 class="section-title">Latest Blogs</h3>
        <div class="blog-list">
          <div v-for="blog in latestBlogs" :key="blog.id" class="blog-card">
            <img :src="blog.coverImage" :alt="blog.title" class="blog-cover" />
            <div class="blog-info">
              <h4>{{ blog.title }}</h4>
              <p class="blog-desc">{{ blog.content.substring(0, 100) }}...</p>
              <div class="blog-meta">
                <span>@{{ blog.authorUsername }}</span>
                <span>{{ new Date(blog.createdAt).toLocaleDateString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右：置顶 Blog -->
      <div class="pinned-blog" v-if="pinnedBlog">
        <h3 class="section-title">Pinned Blog</h3>
        <div class="blog-card pinned">
          <img
            :src="pinnedBlog.coverImage"
            :alt="pinnedBlog.title"
            class="blog-cover"
          />
          <div class="blog-info">
            <h4>{{ pinnedBlog.title }} ★</h4>
            <p class="blog-desc">
              {{ pinnedBlog.content.substring(0, 150) }}...
            </p>
            <div class="blog-meta">
              <span>@{{ pinnedBlog.authorUsername }}</span>
              <span>{{
                new Date(pinnedBlog.createdAt).toLocaleDateString()
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import request from "@/utils/request";

const mainItem = ref(null);
const galleryItems = ref([]);
const latestBlogs = ref([]);
const pinnedBlog = ref(null);
const showInfo = ref(false);
const availableFiles = ref([]); // 存储所有文件列表

onMounted(async () => {
  try {
    // 第一步：获取首页配置
    const configRes = await request.get("/home/config");
    const data = configRes.data;

    // 初始设置 mainItem（可能不完整）
    mainItem.value = {
      type: data.main.type,
      src: data.main.src,
      title: data.main.title,
      description: data.main.desc,
      alt: data.main.alt || "V1rtual的月光时刻～",
      uploaderAvatar: data.main.uploaderAvatar || "/default-avatar.gif",
      uploaderUsername: data.main.uploaderUsername || "V1rtual",
      uploadTime: data.main.uploadTime || "刚刚上传",
      random: data.main.random, // 保持原值（可能是 true/1）
    };

    galleryItems.value = data.galleryItems || [];
    latestBlogs.value = data.latestBlogs || [];
    pinnedBlog.value = data.pinnedBlog || null;
    availableFiles.value = data.availableFiles || [];

    // 第二步：页面加载后立即查数据库完整信息（用 src + type）
    await fetchFullMainItem();
  } catch (err) {
    console.error("加载 Home 配置失败", err);
  }
});

// 查询完整主展示信息（从 src + type 查数据库）
const fetchFullMainItem = async () => {
  if (!mainItem.value || !mainItem.value.src || !mainItem.value.type) return;

  try {
    const res = await request.get("/home/full-item", {
      params: {
        src: mainItem.value.src,
        type: mainItem.value.type,
      },
    });

    const fullData = res.data;
    if (fullData) {
      mainItem.value = {
        ...mainItem.value,
        src: fullData.src,
        title: fullData.title,
        description: fullData.description,
        alt: fullData.alt,
        uploaderAvatar: fullData.uploaderAvatar,
        uploaderUsername: fullData.uploaderUsername,
        uploadTime: fullData.uploadTime,
      };
    }
  } catch (err) {
    console.warn("查询完整主展示失败，使用默认", err);
  }
};

// “换一个”按钮：先换 src，再查完整信息
const changeRandom = async () => {
  if (availableFiles.value.length === 0) {
    window.$vmessage.warning("暂无其他资源可换～");
    return;
  }

  // 随机选一条新 src（避免重复）
  let newSrc;
  do {
    newSrc =
      availableFiles.value[
        Math.floor(Math.random() * availableFiles.value.length)
      ];
  } while (newSrc === mainItem.value.src && availableFiles.value.length > 1);

  // 更新 src
  mainItem.value.src = newSrc;

  // 立即查完整信息（包括用户头像等）
  await fetchFullMainItem();
};
</script>
<style scoped>
.home-wrapper {
  width: 100%;
  min-height: 100vh;
  background: #000;
  color: #00ffff;
  padding: 40px 20px;
  box-sizing: border-box;
}

/* 1. 大展示 */
/* 大展示容器 - 动态底部 padding 模拟“推开” */
.main-showcase {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto 60px;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: 0 0 50px rgba(0, 255, 255, 0.4);
  transition: padding-bottom 0.6s ease;
}

.showcase-media-wrapper {
  position: relative;
}

.showcase-media {
  width: 100%;
  height: auto;
  max-height: 80vh;
  object-fit: cover;
  display: block;
}
/* 弹出时给容器加底部 padding */
.main-showcase.show-info {
  padding-bottom: 100px; /* 栏高 80px + 20px 缓冲 */
}
/* 底部弹出栏：矮 + 左右布局 */
.showcase-info-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px; /* 矮小设计 */
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  padding: 10px 30px;
  box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
}

/* 从下方滑入动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.5s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* 容器：左右分栏 */
.info-container {
  width: 100%;
  max-width: 1000px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
}

/* 左半边：上传人信息 */
.uploader-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 250px;
}

.uploader-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #ff69b4;
  box-shadow: 0 0 10px #ff1493;
}

.uploader-text {
  display: flex;
  flex-direction: column;
}

.uploader-name {
  color: #ff69b4;
  font-weight: bold;
  font-size: 1.1rem;
}

.upload-time {
  color: #aaa;
  font-size: 0.85rem;
}

/* 右半边：标题 + 描述 */
.content-right {
  flex: 1;
  text-align: right;
}

.showcase-title {
  font-size: 1.5rem;
  margin: 0 0 4px 0;
  text-shadow: 0 0 10px #ff00ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.showcase-desc {
  font-size: 0.95rem;
  margin: 0;
  text-shadow: 0 0 8px #00ffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 2. 图片拼图（瀑布流） */
.gallery-masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto 80px;
}

.masonry-item {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  box-shadow: 0 0 30px rgba(255, 20, 147, 0.3);
  transition: transform 0.4s;
}

.masonry-item:hover {
  transform: scale(1.05);
  box-shadow: 0 0 50px rgba(0, 255, 255, 0.6);
}

.masonry-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.masonry-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.4s;
}

.masonry-item:hover .masonry-overlay {
  opacity: 1;
}

.overlay-text {
  color: #fff;
  font-size: 1.3rem;
  text-shadow: 0 0 10px #00ffff;
  padding: 15px;
  text-align: center;
}

/* 3. 最新 Blog */
.latest-blogs {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 40px;
  color: #ff69b4;
  text-shadow: 0 0 20px #ff00ff;
}

.blog-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.blog-card {
  background: rgba(10, 0, 20, 0.7);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(255, 105, 180, 0.3);
  transition: transform 0.4s;
}

.blog-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 0 50px rgba(0, 255, 255, 0.5);
}

.blog-cover {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.blog-info {
  padding: 20px;
}

.blog-info h4 {
  margin: 0 0 10px;
  color: #00ffff;
}

.blog-desc {
  color: #aaa;
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 15px;
}

.blog-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #ff69b4;
}

/* 动画 */
.fade-enter-active,
.info-fade-enter-active {
  transition: all 0.8s ease;
}
.fade-enter-from,
.info-fade-enter-from {
  opacity: 0;
}
.info-fade-enter-from {
  transform: translateY(20px);
}
.blogs-container {
  display: flex;
  gap: 40px;
  max-width: 1200px;
  margin: 80px auto;
}

.latest-blogs {
  flex: 1;
}

.pinned-blog {
  flex: 0 0 400px;
}

.blog-card.pinned {
  border: 3px solid #ff69b4;
  box-shadow: 0 0 40px rgba(255, 105, 180, 0.6);
}

.section-title {
  font-size: 2.2rem;
  text-align: center;
  margin-bottom: 30px;
  color: #ff69b4;
  text-shadow: 0 0 15px #ff00ff;
}
/* 换一个按钮 */
.change-btn {
  margin-top: 8px;
  padding: 6px 14px;
  background: rgba(255, 105, 180, 0.4);
  border: 1px solid #ff69b4;
  color: #ff69b4;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.change-btn:hover {
  background: rgba(255, 105, 180, 0.7);
  transform: scale(1.05);
}
</style>