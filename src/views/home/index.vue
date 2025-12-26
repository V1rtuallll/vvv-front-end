<template>
  <div class="home-wrapper">
    <span class="ht1">Random Memory</span>
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
                <!-- 换一个按钮：判断更宽松，只要random为真值就显示 -->
                <button
                  v-if="mainItem.random"
                  @click="changeRandom"
                  class="change-btn"
                >
                  换一个 ✧
                </button>
              </div>
            </div>

            <!-- 右半边：标题 + 描述 -->
            <!-- 右半边：标题 + 描述（多行完整显示） -->
            <div class="content-right">
              <h2 class="showcase-title">
                {{ mainItem.title || "V1rtual时刻" }}
              </h2>
              <p class="showcase-desc">
                {{ mainItem.description || mainItem.alt || "欢迎" }}
              </p>
            </div>
          </div>
        </div>
      </transition>
    </div>
    <span class="ht2">Random Gallery</span>
    <!-- 2. 随机拼图区（每项独立悬浮窗，与大展示一致） -->
    <div class="gallery-masonry">
      <div
        v-for="(item, index) in galleryItems"
        :key="index"
        class="masonry-item"
        @mouseenter="item.showInfo = true"
        @mouseleave="item.showInfo = false"
      >
        <!-- 媒体 -->
        <video
          v-if="item.type === 'video'"
          :src="item.src"
          autoplay
          loop
          muted
          playsinline
          class="masonry-media"
        />
        <img
          v-else
          :src="item.src"
          :alt="item.title || '未知'"
          class="masonry-media"
        />

        <!-- 每项悬浮窗：和主展示一模一样风格，向内伸进一小节 -->
        <transition name="slide-up">
          <div v-if="item.showInfo" class="gallery-info-bottom">
            <div class="info-container">
              <div class="uploader-left">
                <img
                  :src="item.uploaderAvatar || '/default-avatar.gif'"
                  alt="上传者头像"
                  class="uploader-avatar small"
                />
                <div class="uploader-text">
                  <span class="uploader-name"
                    >@{{ item.uploaderUsername || "V1rtual" }}</span
                  >
                  <span class="upload-time">{{
                    formatShortDate(item.createdAt)
                  }}</span>
                </div>
              </div>
              <div class="content-right">
                <h2 class="showcase-title">{{ item.title || "未知" }}</h2>
                <p class="showcase-desc">
                  {{ item.description || "暂无描述" }}
                </p>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div v-if="galleryItems.length === 0" class="empty-masonry">
        暂无Gallery✨
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

    const galleryRes = await request.get("/home/eight-random-galleries");
    galleryItems.value = (galleryRes.data || []).map((item) => ({
      ...item,
      showInfo: false, // 每项独立控制悬浮窗
    }));
    // 第二步：页面加载后立即查数据库完整信息（用 src + type）
    await fetchFullMainItem();
  } catch (err) {
    console.error("加载 Home 配置失败", err);
  }
});
// 格式化时间（简短版）
const formatShortDate = (date) => {
  if (!date) return "未知";
  return new Date(date).toLocaleDateString("zh-CN");
};
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
@import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@800;900&display=swap");
@import url("https://fonts.googleapis.com/css2?family=LXGW+WenKai+Mono+TC&display=swap");

.ht1,
.ht2 {
  font-family: "Orbitron", "LXGW WenKai Mono TC", monospace;
  font-weight: 900;
  font-size: 3rem;
  color: #00ffff;
  text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff;
  letter-spacing: 0.15em;
}

.home-wrapper {
  width: 100%;
  min-height: 100vh;
  background: #000;
  color: #00ffff;
  padding: 0px 20px;
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
  padding-bottom: 150px; /* 栏高 80px + 20px 缓冲 */
}
/* 底部弹出栏：矮 + 左右布局 */
.showcase-info-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 95px; /* 矮小设计 */
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
  width: 100px;
  height: 100px;
  border: 3px solid #ff69b4;
  box-shadow: 0 0 15px #ff1493;
  object-fit: cover;
  flex-shrink: 0;
}

.uploader-text {
  display: flex;
  flex-direction: column;
}

.uploader-name {
  color: #ff69b4;
  font-weight: bold;
  font-size: 1.2rem;
  text-shadow: 0 0 8px #ff1493, 0 0 15px #ff69b4; /* 双层粉光，温柔又醒目～ */
}

.upload-time {
  color: #bbbbff;
  font-size: 0.9rem;
  text-shadow: 0 0 6px #00ffff44;
}
/* 右半边：标题 + 描述 */
.content-right {
  flex: 1;
  text-align: right;
}

.showcase-title {
  font-size: 1.6rem;
  margin: 0 0 8px 0;
  text-shadow: 0 0 10px #ff00ff, 0 0 20px #ff69b4, 0 0 30px #ff1493; /* 三层渐变光晕，超梦幻但不刺眼～ */
  line-height: 1.4;
  max-height: 4.8rem; /* 限制3行高度，超长淡出 */
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  max-width: 100%;
  word-break: break-word;
}

.showcase-desc {
  font-size: 1.05rem;
  margin: 0;
  text-shadow: 0 0 8px #00ffff, 0 0 15px #00ffff88;
  line-height: 1.5;
  max-height: 6rem; /* 限制4行 */
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  color: #ddffff;
  word-break: break-word;
}
.change-btn {
  margin-top: 12px;
  padding: 8px 18px;
  background: rgba(255, 105, 180, 0.3);
  border: 1px solid #ff69b4;
  color: #ff69b4;
  border-radius: 25px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.4s;
  box-shadow: 0 0 15px rgba(255, 105, 180, 0.4);
  text-shadow: 0 0 10px #ff1493;
}

.change-btn:hover {
  background: rgba(255, 105, 180, 0.6);
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 0 25px rgba(255, 105, 180, 0.8);
}
/* 随机拼图区 */
.gallery-masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto 100px;
}

.masonry-item {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  box-shadow: 0 0 30px rgba(255, 20, 147, 0.3);
  transition: all 0.4s ease;
  aspect-ratio: 3 / 4;
  cursor: pointer;
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
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.6));
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.4s;
}

.masonry-item:hover .masonry-overlay {
  opacity: 1;
}

.overlay-text {
  color: #ffaae6;
  font-size: 1.2rem;
  text-shadow: 0 0 10px #ff69b4;
  padding: 15px;
  text-align: center;
}

/* 每项悬浮窗：从底部向上伸进，半透明 */
.gallery-info-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 140px; /* 稍微高一点，给标题+描述更多空间 */
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 15px 20px;
  box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.5);
  transform: translateY(70%);
  transition: transform 0.5s ease;
  opacity: 0;
  display: flex;
  flex-direction: column; /* 改成 column，让标题+描述垂直排列 */
}

.masonry-item:hover .gallery-info-bottom {
  transform: translateY(0);
  opacity: 1;
}

/* 内部容器：上头像+用户名，下标题+描述 */
.gallery-info-bottom .info-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 上半部分：头像 + 用户名 + 时间 */
.gallery-info-bottom .uploader-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gallery-info-bottom .uploader-avatar.small {
  width: 55px;
  height: 55px;
  border: 2px solid #ff69b4;
  box-shadow: 0 0 12px #ff1493;
}

.gallery-info-bottom .uploader-text {
  display: flex;
  flex-direction: column;
}

.gallery-info-bottom .uploader-name {
  color: #ff69b4;
  font-weight: bold;
  font-size: 1.15rem;
  text-shadow: 0 0 8px #ff1493;
}

.gallery-info-bottom .upload-time {
  color: #cceeff;
  font-size: 0.85rem;
}

/* 下半部分：标题 + 描述（居中偏左，不挤右边） */
.gallery-info-bottom .content-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 10px; /* 轻微左移，避免太靠右 */
}

.gallery-info-bottom .showcase-title {
  font-size: 1.35rem;
  color: #ff69b4;
  margin: 0 0 6px;
  text-shadow: 0 0 10px #ff00ff;
  line-height: 1.3;
}

.gallery-info-bottom .showcase-desc {
  font-size: 0.95rem;
  color: #ddffff;
  text-shadow: 0 0 6px #00ffff;
  line-height: 1.4;
  max-height: 5em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

/* 动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.5s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* 空状态 */
.empty-masonry {
  text-align: center;
  color: #00ffff;
  font-size: 1.3rem;
  padding: 100px 0;
  opacity: 0.8;
}
</style>