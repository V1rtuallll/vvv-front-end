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

// 全局提示函数～像冷白月光信使
const showMessage = (content, duration = 3000) => {
  const id = ++idCounter;
  messages.value.push({ id, content });

  setTimeout(() => {
    const index = messages.value.findIndex((m) => m.id === id);
    if (index > -1) messages.value.splice(index, 1);
  }, duration);
};

// 统一温柔类型（不再区分颜色，全冷白发光）
const VMessage = {
  success: (content, duration) => showMessage(content, duration),
  info: (content, duration) => showMessage(content, duration),
  warning: (content, duration) => showMessage(content, duration),
  error: (content, duration) => showMessage(content, duration),
};

// 挂载到全局，哪里都能温柔呼唤
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
  background: rgba(10, 0, 20, 0.92);
  border: 2px double #fff;
  border-radius: 16px;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.4),
    0 0 40px rgba(255, 255, 255, 0.25), inset 0 0 20px rgba(255, 255, 255, 0.15);
  animation: vmessage-breath 10s infinite ease-in-out,
    subtle-glitch 12s infinite;
  text-align: center;
}

/* 文字：极致冷白发光，无任何渐变色～像黑暗中自然浮现的银祷 */
.vmessage-text {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #fff;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.9),
    0 0 16px rgba(255, 255, 255, 0.7), 0 0 24px rgba(255, 255, 255, 0.5),
    0 0 36px rgba(255, 255, 255, 0.3);
  animation: white-halo 12s infinite ease-in-out;
}

/* 淡入淡出～像月光轻轻散去 */
.vmessage-enter-active,
.vmessage-leave-active {
  transition: all 0.7s ease;
}
.vmessage-enter-from,
.vmessage-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

/* 呼吸光～冷白心跳 */
@keyframes vmessage-breath {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.4),
      0 0 40px rgba(255, 255, 255, 0.25);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.6),
      0 0 60px rgba(255, 255, 255, 0.4);
  }
}

/* 文字呼吸光晕～更空灵 */
@keyframes white-halo {
  0%,
  100% {
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.9),
      0 0 16px rgba(255, 255, 255, 0.7), 0 0 24px rgba(255, 255, 255, 0.5);
  }
  50% {
    text-shadow: 0 0 12px rgba(255, 255, 255, 1),
      0 0 24px rgba(255, 255, 255, 0.9), 0 0 36px rgba(255, 255, 255, 0.7),
      0 0 48px rgba(255, 255, 255, 0.5);
  }
}
</style>