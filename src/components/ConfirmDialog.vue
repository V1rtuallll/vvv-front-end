<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('cancel')">
    <div class="confirm-modal" @click.stop>
      <h2>{{ title }}</h2>
      <p class="confirm-message">{{ message }}</p>
      <div class="modal-actions">
        <button class="confirm-btn" :disabled="confirming" @click="$emit('confirm')">{{ confirming ? "删除中..." : "确认删除" }}</button>
        <button class="cancel-btn" :disabled="confirming" @click="$emit('cancel')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 全站共用的确认弹窗。
 *
 * 用它而不是 window.confirm：浏览器原生弹窗的按钮文案、样式都不受站点控制，
 * 在 CRT 主题里格外突兀，而且会被部分浏览器按「不再显示」静默屏蔽掉。
 *
 * 确认期间由调用方把 confirming 置真，按钮同时禁用两个，避免重复提交。
 */
defineProps({
  visible: Boolean,
  title: { type: String, default: "确认删除" },
  message: { type: String, default: "" },
  confirming: Boolean,
});

defineEmits(["confirm", "cancel"]);
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(1, 40, 70, 0.55); backdrop-filter: blur(6px); }
/* width 与 padding 同时存在，必须用 border-box，否则窄屏下弹窗宽度超出视口 */
.confirm-modal { box-sizing: border-box; width: min(480px, 100%); padding: 30px; color: #2f3b47; text-align: center; background: #ffffff; border: 1px solid #ff69b4; border-radius: 15px; }
.confirm-modal h2 { margin-bottom: 16px; color: #c2185b; font-size: 1.5rem; word-break: break-word; }
.confirm-message { margin-bottom: 24px; color: #54636f; font-size: 1rem; line-height: 1.7; }
.modal-actions { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
.modal-actions button { min-height: 44px; padding: 10px 24px; font-size: 1rem; border-radius: 30px; cursor: pointer; }
.confirm-btn { color: #000; font-weight: bold; background: #ff69b4; border: 1px solid #ff69b4; }
.cancel-btn { color: #2f3b47; background: #ffffff; border: 1px solid #b9c4cc; }
.modal-actions button:disabled { opacity: 0.6; cursor: not-allowed; }

/* ==== 窄屏适配 ==== */
@media (max-width: 768px) {
  .confirm-modal { padding: 24px 16px calc(24px + env(safe-area-inset-bottom)); }
}

@media (max-width: 480px) {
  .modal-actions { flex-direction: column; }
  .modal-actions button { width: 100%; }
}
</style>
