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
            <p class="user-info">描述：{{ user?.description || "未设置～" }}</p>
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
.crt-profile-modal { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.9); backdrop-filter: blur(10px); }
.crt-profile-content { width: 90%; max-width: 800px; max-height: 90vh; overflow: hidden; }
.crt-screen { position: relative; overflow: hidden; background: #000; border-radius: 20px; box-shadow: 0 0 60px rgba(0, 255, 255, 0.6); }
.crt-content { position: relative; z-index: 1; padding: 60px 40px; text-align: center; }
.crt-title { margin-bottom: 40px; color: #00ffff; font-size: 2.8rem; text-shadow: 0 0 30px #00ffff; }
.avatar-section { margin: 40px 0; }
.crt-avatar { width: 160px; height: 160px; object-fit: cover; border: 4px solid #00ffff; border-radius: 50%; box-shadow: 0 0 40px rgba(0, 255, 255, 0.8); }
.info-display { margin: 50px 0; }
.user-info { margin: 25px 0; color: #00ffff; font-size: 1.5rem; text-shadow: 0 0 15px #00ffff; }
.close-profile-btn { margin-top: 40px; }
</style>
