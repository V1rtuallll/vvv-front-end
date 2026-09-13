<template>
  <div v-if="visible" class="crt-profile-modal" @click.self="$emit('close')">
    <div class="crt-profile-content" @click.stop>
      <div class="crt-screen">
        <div class="crt-scanlines"></div>
        <div class="crt-content">
          <h2 class="crt-title">{{ user?.username || "?" }}</h2>
          <div class="avatar-section"><img :src="user?.avatar || '/default-avatar.gif'" alt="头像" class="crt-avatar" /></div>
          <div class="info-display">
            <p class="user-info">ID：{{ user?.id }}</p>
            <p class="user-info">性别：{{ displayGender(user?.sex) }}</p>
            <p class="user-info">描述：{{ user?.description || "未设置" }}</p>
            <p class="user-info">创建时间：{{ formatDate(user?.createdAt || user?.createTime) }}</p>
          </div>
          <button @click="$emit('close')" class="crt-mini-btn close-profile-btn">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: Boolean,
  user: { type: Object, default: null },
  displayGender: { type: Function, required: true },
  formatDate: { type: Function, required: true },
});

defineEmits(["close"]);
</script>

<style scoped>
.crt-profile-modal { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; background: rgba(0, 0, 0, 0.9); backdrop-filter: blur(10px); }
/* width 与内层 padding 并存，overflow-y 保证内容超高时可滚动而不是被裁掉 */
.crt-profile-content { box-sizing: border-box; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; }
.crt-screen { position: relative; overflow: hidden; background: #000; border-radius: 20px; box-shadow: 0 0 60px rgba(0, 255, 255, 0.6); }
.crt-content { position: relative; z-index: 1; padding: 60px 40px; text-align: center; }
.crt-title { margin-bottom: 40px; color: #00ffff; font-size: 2.8rem; text-shadow: 0 0 30px #00ffff; word-break: break-word; }
.avatar-section { margin: 40px 0; }
.crt-avatar { width: 160px; height: 160px; object-fit: cover; border: 4px solid #00ffff; border-radius: 50%; box-shadow: 0 0 40px rgba(0, 255, 255, 0.8); }
.info-display { margin: 50px 0; }
.user-info { margin: 25px 0; color: #00ffff; font-size: 1.5rem; text-shadow: 0 0 15px #00ffff; word-break: break-word; }
.close-profile-btn { margin-top: 40px; min-height: 44px; padding: 10px 24px; }

/* ==== 窄屏适配 ====
   <=768px：弹窗接近全屏，收紧内边距与头像尺寸，长描述换行不撑破容器；
   <=480px：铺满视口宽度。
*/
@media (max-width: 768px) {
  .crt-profile-modal { padding: 12px; }
  .crt-profile-content { width: 100%; max-height: 92vh; max-height: 92dvh; }
  .crt-content { padding: 28px 18px; }
  .crt-title { margin-bottom: 20px; font-size: 1.8rem; }
  .avatar-section { margin: 20px 0; }
  .crt-avatar { width: 110px; height: 110px; border-width: 3px; }
  .info-display { margin: 24px 0; }
  .user-info { margin: 14px 0; font-size: 1.1rem; }
  .close-profile-btn { margin-top: 24px; }
}

@media (max-width: 480px) {
  .crt-profile-modal { padding: 0; }
  .crt-profile-content { max-height: 100vh; max-height: 100dvh; }
  .crt-screen { border-radius: 0; min-height: 100vh; min-height: 100dvh; }
  .crt-content { padding: 24px 12px; }
  .crt-title { font-size: 1.5rem; }
  .crt-avatar { width: 92px; height: 92px; }
  .user-info { font-size: 1rem; }
}
</style>
