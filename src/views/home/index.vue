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
import { useHomeContent } from "@/modules/home/composables/useHomeContent";

const { mainItem, galleryItems, latestBlogs, pinnedBlog, showInfo, availableFiles, formatShortDate, changeRandom } = useHomeContent();
</script>
<style src="./index.css" scoped></style>