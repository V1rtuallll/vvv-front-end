<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="edit-modal" @click.stop>
      <h2>编辑资源</h2>

      <div class="edit-field">
        <span class="field-label">文件</span>
        <div class="file-row">
          <span class="file-current" :title="item?.src">{{ currentName }}</span>
          <label class="file-pick">
            <input type="file" :accept="ACCEPT" class="file-input" @change="onPickFile" />
            <span class="file-pick-btn">{{ replacementFile ? "换一个" : "更换文件" }}</span>
          </label>
          <button v-if="replacementFile" class="file-clear" @click="$emit('select-replacement', null)">
            撤销更换
          </button>
        </div>
        <p v-if="replacementFile" class="file-chosen">
          将替换为：<strong>{{ replacementFile.name }}</strong>
          （保存后才会上传，进度显示在页面顶部）
        </p>
        <p v-else class="file-hint">
          不选新文件就只改标题与描述；换了文件则保存后依次上传新文件、更新资源。
        </p>
      </div>

      <label class="edit-field">
        <span class="field-label">标题</span>
        <input v-model="form.title" class="field-input" />
      </label>

      <label class="edit-field">
        <span class="field-label">描述</span>
        <textarea v-model="form.description" rows="3" class="field-input field-textarea"></textarea>
      </label>

      <GalleryBgmPicker v-model="bgm" />

      <div class="modal-actions">
        <button class="save-btn" :disabled="saving" @click="submit">{{ saving ? "保存中..." : "保存" }}</button>
        <button class="cancel-btn" :disabled="saving" @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";

import GalleryBgmPicker from "@/views/gallery/components/GalleryBgmPicker.vue";

const props = defineProps({
  visible: Boolean,
  item: { type: Object, default: null },
  saving: Boolean,
  /** 已选好的替换文件；为空表示只改元数据 */
  replacementFile: { type: Object, default: null },
});

const emit = defineEmits(["close", "submit", "select-replacement"]);

const ACCEPT = ".jpg,.jpeg,.png,.webp,.bmp,.gif,.mp4,.webm,.avi,.mov,.mkv,.mp3,.wav,.flac,.aac,.ogg";

// 只开放标题与描述。alt / 标签 / 分类目前没有对应的业务场景，先不放进表单。
const EDITABLE_KEYS = ["title", "description"];

const emptyForm = () => EDITABLE_KEYS.reduce((form, key) => ({ ...form, [key]: "" }), {});

const form = ref(emptyForm());
let initialForm = emptyForm();

// { src, type } 或 null。与接口字段同形，不做转换
const bgm = ref(null);
let initialBgm = null;

const currentName = computed(() => {
  const src = props.item?.src ?? "";
  const path = String(src).split("?")[0];
  return path.substring(path.lastIndexOf("/") + 1) || "（未知文件）";
});

const syncForm = (item) => {
  const next = emptyForm();
  EDITABLE_KEYS.forEach((key) => {
    const value = item?.[key];
    if (value != null) next[key] = String(value);
  });
  form.value = { ...next };
  initialForm = { ...next };
  const nextBgm = item?.bgmSrc ? { src: item.bgmSrc, type: item.bgmType ?? "audio" } : null;
  bgm.value = nextBgm;
  initialBgm = nextBgm;
};

watch(
  () => [props.visible, props.item],
  () => {
    if (props.visible) syncForm(props.item);
  },
  { immediate: true },
);

const onPickFile = (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (file) emit("select-replacement", file);
};

// 只提交真正改动过的字段，避免把没碰过的值也一起写回。
const submit = () => {
  const payload = {};
  EDITABLE_KEYS.forEach((key) => {
    if (form.value[key] !== initialForm[key]) payload[key] = form.value[key];
  });
  // BGM 是一对：变了就两个一起发（清空时两个都是 null），没变就不提它。
  // 只发一边会被服务端当成参数不完整，而不是「清空」
  if (bgmChanged()) {
    payload.bgmSrc = bgm.value?.src ?? null;
    payload.bgmType = bgm.value?.type ?? null;
  }
  emit("submit", payload);
};

const bgmChanged = () => {
  if (!initialBgm && !bgm.value) return false;
  if (!initialBgm || !bgm.value) return true;
  return initialBgm.src !== bgm.value.src || initialBgm.type !== bgm.value.type;
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

/* 文件行：当前文件名 + 更换 + 撤销，窄屏自动折行 */
.file-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.file-current { flex: 1 1 200px; min-width: 0; overflow: hidden; color: #cceeff; font-size: 0.92rem; white-space: nowrap; text-overflow: ellipsis; }
.file-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.file-pick { flex: 0 0 auto; cursor: pointer; }
/* 触摸目标不小于 44px */
.file-pick-btn { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 18px; color: #000; font-weight: bold; background: #00ffff; border-radius: 8px; }
.file-clear { min-height: 44px; padding: 8px 16px; color: #ff69b4; font-size: 0.9rem; background: rgba(255, 105, 180, 0.15); border: 1px solid #ff69b4; border-radius: 8px; cursor: pointer; }
.file-chosen { color: #ffaae6; font-size: 0.88rem; line-height: 1.6; word-break: break-all; }
.file-hint { color: #aaa; font-size: 0.85rem; line-height: 1.6; }

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
