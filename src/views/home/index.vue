<template>
  <div class="home-wrapper">
    <!-- 最顶上大展示框～你的主打视频/图片，会轻轻淡入像月光洒落～ -->
    <div class="main-showcase">
      <transition name="fade">
        <div v-if="mainItem" key="main">
          <video
            v-if="mainItem.type === 'video'"
            :src="mainItem.src"
            autoplay
            loop
            muted
            playsinline
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
    </div>

    <!-- 下面轮播图～gallery其他宝贝轻轻滚动～ -->
    <div class="gallery-carousel">
      <div
        class="carousel-item"
        v-for="(item, index) in galleryItems"
        :key="index"
      >
        <img :src="item.src" :alt="item.alt" class="carousel-img" />
      </div>
    </div>

    <!-- 再下面待定区～以后加文字、贴纸、心情等～现在留白超级干净 -->
    <div class="future-section">
      <p class="coming-soon">慢慢来</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

// 模拟home数据库～以后管理页直接改这个数据就行超级容易！
const homeData = ref({
  // 最顶上大展示（支持图片或视频）
  mainItem: {
    type: "video", // "image" 或 "video"
    src: "https://example.com/your-emo-video.mp4", // 你的主打视频或图片链接
    alt: "V1rtual的月光时刻～",
  },
  // 轮播图gallery（数组，越多越好看～）
  galleryItems: [
    // {
    //   src: "https://wallpapers.com/images/hd/sad-anime-boy-in-black-hoodie-sjfzqwn5cuwba9yf.jpg",
    //   alt: "emo夜晚1",
    // },
    // {
    //   src: "https://wallpapers.com/images/hd/crying-emo-pfp-us0o136013drckz3.jpg",
    //   alt: "emo夜晚2",
    // },
    // {
    //   src: "https://wallpapers.com/images/hd/dark-assassin-anime-boy-u6dgp1mif38uaxvz.jpg",
    //   alt: "emo夜晚3",
    // },
    // {
    //   src: "https://wallpapers.com/images/hd/sad-anime-death-b73agkh9tusrgalg.jpg",
    //   alt: "emo夜晚4",
    // },
    // {
    //   src: "https://wallpapers.com/images/hd/animation-pictures-ne2jv3xw2b8jdp3w.jpg",
    //   alt: "emo夜晚5",
    // },
  ],
});

// 解构方便用
const { mainItem, galleryItems } = homeData.value;
</script>

<style scoped>
/* 整体纯黑夜空～沉浸感满满 */
.home-wrapper {
  width: 100%;
  min-height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  box-sizing: border-box;
  color: #00ffff;
}

/* 大展示框～最顶上超级大气 */
.main-showcase {
  width: 100%;
  max-width: 900px;
  margin-bottom: 60px;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(0, 255, 255, 0.4),
    inset 0 0 40px rgba(0, 255, 255, 0.2);
}
.showcase-media {
  width: 100%;
  height: auto;
  max-height: 80vh;
  object-fit: cover;
  display: block;
}

/* 淡入动画～像月光轻轻洒落 */
.fade-enter-active {
  transition: opacity 2s ease, transform 2s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

/* 轮播图～横向轻轻滚动 */
.gallery-carousel {
  width: 100%;
  max-width: 1000px;
  display: flex;
  overflow-x: auto;
  gap: 30px;
  padding: 20px 0;
  scrollbar-width: none;
}
.gallery-carousel::-webkit-scrollbar {
  display: none;
}
.carousel-item {
  flex-shrink: 0;
}
.carousel-img {
  width: 300px;
  height: 400px;
  object-fit: cover;
  border-radius: 20px;
  border: 4px solid #ff00ff;
  box-shadow: 0 0 30px #ff1493;
  transition: transform 0.3s;
}
.carousel-img:hover {
  transform: scale(1.08);
}

/* 待定区～留白超级干净，等你慢慢填～ */
.future-section {
  margin-top: 80px;
  text-align: center;
  font-size: 1.8rem;
  color: #00aaaa;
  text-shadow: 0 0 15px #00ffff;
}
.coming-soon {
  animation: pulse 4s infinite ease-in-out;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>