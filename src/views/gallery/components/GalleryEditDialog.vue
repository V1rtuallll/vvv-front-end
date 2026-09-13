<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="edit-modal" @click.stop>
      <h2>编辑资源</h2>
      <label class="edit-field">
        <span class="field-label">标题</span>
        <input v-model="form.title" class="field-input" />
      </label>
      <label class="edit-field">
        <span class="field-label">描述</span>
        <textarea v-model="form.description" rows="3" class="field-input field-textarea"></textarea>
      </label>
      <p class="edit-tip">资源文件与类型不可修改，更换文件请重新上传。</p>
      <div class="modal-actions">
        <button class="save-btn" :disabled="saving" @click="submit">{{ saving ? "保存中..." : "保存" }}</button>
        <button class="cancel-btn" :disabled="saving" @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  visible: Boolean,
  item: { type: Object, default: null },
  saving: Boolean,
});

const emit = defineEmits(["close", "submit"]);

// 只开放标题与描述。alt / 标签 / 分类目前没有对应的业务场景，先不放进表单；
// src / type / user_id 由后端拒绝修改，换文件要走新的上传流程。
const EDITABLE_KEYS = ["title", "description"];

const emptyForm = () => EDITABLE_KEYS.reduce((form, key) => ({ ...form, [key]: "" }), {});

const form = ref(emptyForm());
let initialForm = emptyForm();

const syncForm = (item) => {
  const next = emptyForm();
  EDITABLE_KEYS.forEach((key) => {
    const value = item?.[key];
    if (value != null) next[key] = String(value);
  });
  form.value = { ...next };
  initialForm = { ...next };
};

watch(
  () => [props.visible, props.item],
  () => {
    if (props.visible) syncForm(props.item);
  },
  { immediate: true },
);

// 只提交真正改动过的字段，避免把没碰过的值也一起写回。
const submit = () => {
  const payload = {};
  EDITABLE_KEYS.forEach((key) => {
    if (form.value[key] !== initialForm[key]) payload[key] = form.value[key];
  });
  emit("submit", payload);
};
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0, 0, 0, 0.96); backdrop-filter: blur(15px); }
/* width 与 padding 同时存在，必须用 border-box，否则窄屏下弹窗宽度超出视口 */
.edit-modal { box-sizing: border-box; width: min(640px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; padding: 30px; color: #00ffff; background: rgba(0, 0, 20, 0.98); border: 2px solid #00ffff; border-radius: 15px; box-shadow: 0 0 30px #00ffff88; }
.edit-modal h2 { margin-bottom: 20px; color: #ff69b4; font-size: 1.6rem; }
.edit-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
.field-label { color: #ffaae6; font-size: 1rem; }
.field-input { box-sizing: border-box; width: 100%; min-height: 44px; padding: 12px; color: #00ffff; font-size: 1rem; background: rgba(0, 0, 0, 0.6); border: 1px solid #00ffff88; border-radius: 10px; }
.field-textarea { min-height: 80px; resize: vertical; }
.edit-tip { margin-bottom: 20px; color: #aaa; font-size: 0.9rem; }
.modal-actions { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
.modal-actions button { min-height: 44px; padding: 10px 24px; font-size: 1rem; border-radius: 30px; cursor: pointer; }
.save-btn { color: #000; font-weight: bold; background: #00ffff; border: 2px solid #00ffff; }
.cancel-btn { color: #ff69b4; background: rgba(255, 105, 180, 0.2); border: 2px solid #ff69b4; }
.modal-actions button:disabled { opacity: 0.6; cursor: not-allowed; }

/* ==== 窄屏适配 ==== */
@media (max-width: 768px) {
  .modal-overlay { align-items: flex-end; padding: 0; }
  .edit-modal { width: 100%; max-height: 92vh; max-height: 92dvh; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); border-radius: 18px 18px 0 0; }
}

@media (max-width: 480px) {
  .edit-modal { padding: 16px 12px calc(16px + env(safe-area-inset-bottom)); }
  .edit-modal h2 { font-size: 1.3rem; }
  .modal-actions { flex-direction: column; }
  .modal-actions button { width: 100%; }
}
</style>
