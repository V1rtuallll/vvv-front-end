<template>
  <div v-if="visible" class="crt-profile-modal" @click.self="$emit('close')">
    <div class="crt-profile-content" @click.stop>
      <div class="crt-screen">
        <div class="crt-scanlines"></div>
        <div class="crt-content">
          <h2 class="crt-title">{{ user?.username || "?" }}</h2>
          <!-- 资料读不到时只说明情况：这一层没有可展示的事实，填上默认头像与
               「未设置」「未知时间」会把空值显示成服务器返回的内容 -->
          <p v-if="user?.loadFailed" class="profile-error">用户信息加载失败</p>
          <template v-else>
            <div class="avatar-section"><img :src="user?.avatar || '/default-avatar.gif'" alt="头像" class="crt-avatar" /></div>
            <div class="info-display">
              <p class="user-info">ID：{{ user?.id }}</p>
              <p class="user-info">性别：{{ displayGender(user?.sex) }}</p>
              <p class="user-info">描述：{{ user?.description || "未设置" }}</p>
              <p class="user-info">创建时间：{{ formatDate(user?.createdAt || user?.createTime) }}</p>
            </div>
          </template>
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
.crt-profile-modal { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; background: rgba(1, 40, 70, 0.55); backdrop-filter: blur(6px); }
/* width 与内层 padding 并存，overflow-y 保证内容超高时可滚动而不是被裁掉 */
.crt-profile-content { box-sizing: border-box; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; }
.crt-screen { position: relative; overflow: hidden; background: #e9f2f9; border-radius: 4px; }
.crt-content { position: relative; z-index: 1; padding: 60px 40px; text-align: center; }
.crt-title { margin-bottom: 40px; color: #2f3b47; font-size: 2.8rem; word-break: break-word; }
.avatar-section { margin: 40px 0; }
.crt-avatar { width: 160px; height: 160px; object-fit: cover; border: 2px solid #ff69b4; border-radius: 50%; }
.info-display { margin: 50px 0; }
.user-info { margin: 25px 0; color: #2f3b47; font-size: 1.5rem; word-break: break-word; }
/* 读不到资料时的说明占的就是信息区那块位置，字号与信息行一致 */
.profile-error { margin: 50px 0; color: #2f3b47; font-size: 1.5rem; word-break: break-word; }
.close-profile-btn { margin-top: 40px; min-height: 44px; padding: 10px 24px; }

/* ==== 窄屏适配 ====
   <=768px：仍然是「居中卡片」，只把四周留白收到 20px、高度上限收到 85% —— **不铺满视口**。
   满屏那张脸和页面本身没有边界，看起来不像弹窗，和详情弹窗的窄屏处理也不一致。
   <=480px：只再压一档字号与头像，留白与圆角维持不变。
*/
@media (max-width: 768px) {
  .crt-profile-modal { padding: 20px; }
  .crt-profile-content { width: 100%; max-height: 85vh; max-height: 85dvh; }
  .crt-content { padding: 28px 18px; }
  .crt-title { margin-bottom: 20px; font-size: 1.8rem; }
  .avatar-section { margin: 20px 0; }
  .crt-avatar { width: 110px; height: 110px; border-width: 3px; }
  .info-display { margin: 24px 0; }
  .user-info { margin: 14px 0; font-size: 1.1rem; }
  .profile-error { margin: 24px 0; font-size: 1.1rem; }
  .close-profile-btn { margin-top: 24px; }
}

@media (max-width: 480px) {
  .crt-content { padding: 24px 12px; }
  .crt-title { font-size: 1.5rem; }
  .crt-avatar { width: 92px; height: 92px; }
  .user-info { font-size: 1rem; }
  .profile-error { font-size: 1rem; }
}
</style>
