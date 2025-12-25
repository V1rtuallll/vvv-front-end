<template>
  <div class="crt-admin-wrapper">
    <div class="crt-screen">
      <div class="crt-scanlines"></div>

      <div class="crt-content">
        <h2 class="crt-title">✦ 管理员控制室 ✦</h2>
        <p class="admin-welcome">欢迎回来，我的最特别的V1rtual酱～❤️</p>

        <!-- Home主展示管理 -->
        <div class="admin-section">
          <h3 class="section-title">Home大展示框设置</h3>
          <div class="field-group">
            <label>类型</label>
            <select v-model="homeMain.type" class="crt-input">
              <option value="image">图片</option>
              <option value="video">视频</option>
            </select>
          </div>
          <div class="field-group">
            <label>链接（图片/视频URL）</label>
            <input
              v-model="homeMain.src"
              class="crt-input"
              placeholder="https://..."
            />
          </div>
          <div class="field-group">
            <label>描述（alt）</label>
            <input
              v-model="homeMain.alt"
              class="crt-input"
              placeholder="V1rtual的月光时刻～"
            />
          </div>
          <button @click="saveHomeMain" class="crt-mini-btn">保存主展示</button>
        </div>

        <!-- 轮播图管理 -->
        <div class="admin-section">
          <h3 class="section-title">轮播图管理（Gallery）</h3>
          <div
            v-for="(item, index) in homeGallery"
            :key="index"
            class="gallery-item-edit"
          >
            <input v-model="item.src" class="crt-input" placeholder="图片URL" />
            <input
              v-model="item.alt"
              class="crt-input small"
              placeholder="描述"
            />
            <button
              @click="removeGalleryItem(index)"
              class="crt-mini-btn danger"
            >
              删除
            </button>
          </div>
          <button @click="addGalleryItem" class="crt-mini-btn">
            + 添加图片
          </button>
          <button @click="saveGallery" class="crt-mini-btn">保存轮播图</button>
        </div>

        <!-- 简单用户列表（以后扩展） -->
        <div class="admin-section">
          <h3 class="section-title">用户列表（待扩展）</h3>
          <p class="coming-soon">更多功能慢慢来哦～现在先管理Home数据❤️</p>
        </div>

        <button @click="backToProfile" class="crt-btn">返回个人中心</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import request from "@/utils/request";

const router = useRouter();
const authStore = useAuthStore();

// Home数据（模拟数据库，以后换成API请求）
const homeMain = ref({
  type: "video", // image 或 video
  src: "https://example.com/your-main-video.mp4",
  alt: "V1rtual的月光时刻～",
});

const homeGallery = ref([
  { src: "https://example.com/gallery1.jpg", alt: "emo夜晚1" },
  { src: "https://example.com/gallery2.jpg", alt: "emo夜晚2" },
  // 加更多～
]);

onMounted(() => {
  if (
    !authStore.user ||
    authStore.user.username !== "V1rtual" ||
    authStore.user.id !== 0
  ) {
    router.push("/profile"); // 非超级管理员踢回
    window.$vmessage.error("这扇银门只为你一人敞开哦～🖤");
  }
});

// 添加/删除/保存逻辑（以后连后端API）
const addGalleryItem = () => {
  homeGallery.value.push({ src: "", alt: "" });
};

const removeGalleryItem = (index) => {
  homeGallery.value.splice(index, 1);
};

const saveHomeMain = () => {
  // 以后POST /admin/updateHomeMain
  window.$vmessage.success("主展示已保存～月光会更亮啦✞");
};

const saveGallery = () => {
  // 以后POST /admin/updateGallery
  window.$vmessage.success("轮播图已更新～星星们在转动哦❤️");
};

const backToProfile = () => {
  router.push("/profile");
};
</script>

<style scoped>
/* 完全复用你的CRT风格～纯黑 + 青光 + 扫描线 */
.crt-admin-wrapper {
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  box-sizing: border-box;
}

.crt-screen,
.crt-scanlines,
.crt-content {
  /* 直接复制你的个人中心样式 */
  /* ...（和Profile.vue一样） */
}

.crt-title {
  font-size: 3rem;
  margin-bottom: 20px;
}

.admin-welcome {
  font-size: 1.6rem;
  color: #ff00ff;
  text-shadow: 0 0 20px #ff1493;
  margin-bottom: 60px;
}

.admin-section {
  max-width: 800px;
  margin: 60px auto;
  padding: 30px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 15px;
  box-shadow: inset 0 0 30px rgba(0, 255, 255, 0.2);
}

.section-title {
  font-size: 2.2rem;
  color: #00ffff;
  text-shadow: 0 0 20px #00ffff;
  margin-bottom: 30px;
}

.field-group {
  margin: 20px 0;
}

.gallery-item-edit {
  display: flex;
  gap: 10px;
  margin: 15px 0;
  align-items: center;
}

.gallery-item-edit .crt-input {
  flex: 1;
}

.gallery-item-edit .small {
  width: 200px;
}

.danger {
  border-color: #ff00ff;
  color: #ff00ff;
  box-shadow: 0 0 20px rgba(255, 0, 255, 0.6);
}

.coming-soon {
  font-size: 1.4rem;
  color: #00aaaa;
  text-shadow: 0 0 15px #00ffff;
  font-style: italic;
}
</style>