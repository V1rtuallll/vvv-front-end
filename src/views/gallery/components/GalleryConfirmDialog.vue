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
defineProps({
  visible: Boolean,
  title: { type: String, default: "确认删除" },
  message: { type: String, default: "" },
  confirming: Boolean,
});

defineEmits(["confirm", "cancel"]);
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0, 0, 0, 0.96); backdrop-filter: blur(15px); }
/* width 与 padding 同时存在，必须用 border-box，否则窄屏下弹窗宽度超出视口 */
.confirm-modal { box-sizing: border-box; width: min(480px, 100%); padding: 30px; color: #00ffff; text-align: center; background: rgba(0, 0, 20, 0.98); border: 2px solid #ff69b4; border-radius: 15px; box-shadow: 0 0 30px rgba(255, 105, 180, 0.5); }
.confirm-modal h2 { margin-bottom: 16px; color: #ff69b4; font-size: 1.5rem; word-break: break-word; }
.confirm-message { margin-bottom: 24px; color: #cceeff; font-size: 1rem; line-height: 1.7; }
.modal-actions { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
.modal-actions button { min-height: 44px; padding: 10px 24px; font-size: 1rem; border-radius: 30px; cursor: pointer; }
.confirm-btn { color: #000; font-weight: bold; background: #ff69b4; border: 2px solid #ff69b4; }
.cancel-btn { color: #00ffff; background: rgba(0, 255, 255, 0.15); border: 2px solid #00ffff; }
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
