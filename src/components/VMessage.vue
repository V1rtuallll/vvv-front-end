<template>
  <transition-group name="vmessage" tag="div" class="vmessage-container">
    <div v-for="msg in messages" :key="msg.id" class="vmessage-item">
      <span class="vmessage-text">{{ msg.content }}</span>
    </div>
  </transition-group>
</template>

<script setup>
import { ref, onMounted } from "vue";

const messages = ref([]);

let idCounter = 0;

const showMessage = (content, duration = 3000) => {
  const id = ++idCounter;
  messages.value.push({ id, content });
  // 直接调用全局随机音效
  if (window.playGlobalRandomSound) {
    window.playGlobalRandomSound();
  }
  setTimeout(() => {
    const index = messages.value.findIndex((m) => m.id === id);
    if (index > -1) messages.value.splice(index, 1);
  }, duration);
};

const VMessage = {
  success: (content, duration) => showMessage(content, duration),
  info: (content, duration) => showMessage(content, duration),
  warning: (content, duration) => showMessage(content, duration),
  error: (content, duration) => showMessage(content, duration),
};

onMounted(() => {
  if (!window.$vmessage) {
    window.$vmessage = VMessage;
  }
});
</script>
<style scoped>
.vmessage-container {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  pointer-events: none;
}

.vmessage-item {
  min-width: 320px;
  padding: 18px 32px;
  background: #ffffff;
  border: 1px solid #b9c4cc;
  border-radius: 0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  text-align: center;
}

/* 文字 */
.vmessage-text {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #000000;
}

/* 淡入淡出 */
.vmessage-enter-active,
.vmessage-leave-active {
  transition: all 0.7s ease;
}
.vmessage-enter-from,
.vmessage-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

/* 呼吸光 */

/* 文字呼吸光晕*/
</style>