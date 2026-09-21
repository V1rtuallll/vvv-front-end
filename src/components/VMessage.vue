<template>
  <transition-group name="vmessage" tag="div" class="vmessage-container">
    <div v-for="msg in messages" :key="msg.id" class="vmessage-item">
      <span class="vmessage-text">{{ msg.content }}</span>
    </div>
  </transition-group>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

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

/**
 * 每次挂载都无条件把全局把手换成当前实例。
 *
 * 这里原本是 `if (!window.$vmessage)`，只在还没有把手时才写。于是 HMR 重建、
 * 任何一次重新挂载之后，把手仍然指着**第一个**实例：那个实例的 DOM 已经不在
 * 了，而 `showMessage` 里的音效是普通全局函数、与实例无关，照样会响 ——
 * 用户听到提示音，屏幕上却没有提示框。
 */
onMounted(() => {
  window.$vmessage = VMessage;
});

/**
 * 卸载时只在把手仍指向本实例时才清掉。
 *
 * 重建的次序可能是新的先挂载、旧的再卸载：无条件置 null 会把新实例刚装好的
 * 把手抹掉，而它不会再装第二次，提示从此静默。
 */
onUnmounted(() => {
  if (window.$vmessage === VMessage) window.$vmessage = null;
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
  /* border-box：把 padding 和边框算进 min-width / max-width 里。
     原本是 content-box，320px 的 min-width 加上左右各 32px padding、
     1px 边框，实际宽 386px —— 比 375px 的视口还宽，窄屏上两头都出界 */
  box-sizing: border-box;
  /* 386px = 原来的实际宽度：桌面端一个像素都不变。
     视口装不下 386px 时退到「视口宽减两侧各 12px」，字体不大时提示不折行 */
  min-width: min(386px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
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