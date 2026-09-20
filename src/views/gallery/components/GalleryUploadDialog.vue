<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="upload-modal" @click.stop>
      <h2>上传到Gallery</h2>

      <div class="upload-area">
        <label class="file-label">
          <span>选择文件（一次一个）</span>
          <input type="file" :accept="ACCEPT" class="hidden-input" @change="onPickFile" />
          <span class="select-btn">选择文件</span>
        </label>
        <p v-if="limitText" class="limit-tip">{{ limitText }}</p>
      </div>

      <template v-if="file">
        <div class="preview-box">
          <img v-if="kind === 'image'" :src="previewUrl" class="preview-media" alt="" />
          <video v-else-if="kind === 'video'" :src="previewUrl" class="preview-media" controls></video>
          <audio v-else-if="kind === 'audio'" :src="previewUrl" class="preview-media" controls></audio>
          <span v-else class="preview-none">{{ file.name }}</span>
        </div>

        <label class="edit-field">
          <span class="field-label">标题</span>
          <input v-model="title" class="crt-input" placeholder="默认用文件名" />
        </label>

        <label class="edit-field">
          <span class="field-label">描述</span>
          <textarea v-model="description" class="crt-input" placeholder="写点描述"></textarea>
        </label>

        <!-- 只有图片能配 BGM：后端规则 3 会给音乐/视频项整条请求回 400，
             而上传路径上那意味着文件根本没传上去 -->
        <GalleryBgmPicker v-if="kind === 'image'" v-model="bgm" />
      </template>

      <div class="modal-actions">
        <button class="crt-btn" :disabled="!file" @click="publish">发表</button>
        <button class="crt-btn danger" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";

import GalleryBgmPicker from "@/views/gallery/components/GalleryBgmPicker.vue";

const props = defineProps({
  visible: Boolean,
  /** 来自后端配置的大小上限提示 */
  limitText: { type: String, default: "" },
});

const emit = defineEmits(["close", "publish"]);

const ACCEPT = ".jpg,.jpeg,.png,.webp,.bmp,.gif,.mp4,.webm,.avi,.mov,.mkv,.mp3,.wav,.flac,.aac,.ogg";

// 一次上传对应一个资源，所以只需要一份标题与描述
const file = ref(null);
const title = ref("");
const description = ref("");
const previewUrl = ref("");

// 随图配的背景音乐 { src, type } 或 null，形状与接口字段一致，不做转换
const bgm = ref(null);

const releasePreview = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
};

const reset = () => {
  releasePreview();
  file.value = null;
  title.value = "";
  description.value = "";
  bgm.value = null;
};

// 每次打开都是一个干净的表单，不会带上一次的内容
watch(
  () => props.visible,
  (visible) => {
    if (visible) reset();
  },
);

onBeforeUnmount(releasePreview);

const EXTENSION_KIND = {
  mp4: "video", webm: "video", avi: "video", mov: "video", mkv: "video",
  gif: "image", jpg: "image", jpeg: "image", png: "image", webp: "image", bmp: "image",
  mp3: "audio", wav: "audio", flac: "audio", aac: "audio", ogg: "audio",
};

const kind = computed(() => {
  const name = file.value?.name ?? "";
  const dot = name.lastIndexOf(".");
  return EXTENSION_KIND[dot > 0 ? name.substring(dot + 1).toLowerCase() : ""] ?? "unknown";
});

const onPickFile = (event) => {
  const picked = event.target.files?.[0];
  event.target.value = "";
  if (!picked) return;
  releasePreview();
  file.value = picked;
  previewUrl.value = URL.createObjectURL(picked);
  // 标题留空就由服务端用文件名兜底，这里不预填，用户想改自己写
  title.value = "";
  description.value = "";
  // 换了文件就是新的一份表单：BGM 跟着标题与描述一起清掉。
  // 不清的话「图片配了曲 → 换成视频」会留下一份选不中也没有入口取消的 BGM，
  // 发表时被后端整条拒掉，用户还找不到东西可删
  bgm.value = null;
};

const publish = () => {
  if (!file.value) return;
  emit("publish", {
    file: file.value,
    title: title.value.trim(),
    description: description.value.trim(),
    bgm: bgm.value,
  });
  reset();
};
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0, 0, 0, 0.96); backdrop-filter: blur(15px); }
/* width 与 padding 同时存在，必须用 border-box，否则窄屏下弹窗宽度超出视口 */
.upload-modal { box-sizing: border-box; width: min(640px, 100%); max-height: calc(100vh - 40px); overflow: auto; padding: 30px; color: #00ffff; background: rgba(0, 0, 20, 0.98); border: 2px solid #00ffff; border-radius: 15px; box-shadow: 0 0 30px #00ffff88; }
.upload-modal h2 { margin-bottom: 20px; color: #ff69b4; font-size: 1.6rem; }
.file-label { display: flex; flex-direction: column; gap: 12px; cursor: pointer; }
.hidden-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
/* 触摸目标不小于 44px */
.select-btn { width: fit-content; min-height: 44px; display: inline-flex; align-items: center; padding: 10px 18px; color: #000; font-weight: bold; background: #00ffff; border-radius: 6px; }
.limit-tip { margin-top: 10px; color: #ffaae6; font-size: 0.9rem; }

/* 预览固定高度，不随文件尺寸变化 */
.preview-box { display: flex; align-items: center; justify-content: center; width: 100%; height: 220px; margin: 20px 0; overflow: hidden; background: rgba(0, 0, 0, 0.6); border-radius: 10px; }
.preview-media { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
.preview-none { padding: 20px; color: #00ffff; text-align: center; word-break: break-all; }

.edit-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; text-align: left; }
.field-label { color: #ffaae6; font-size: 1rem; }

.modal-actions { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
/* 两个按钮尺寸完全一致，只靠颜色区分主次 */
.modal-actions > * { flex: 0 0 auto; min-width: 180px; margin: 0; }

/* ==== 窄屏适配 ==== */
@media (max-width: 768px) {
  .modal-overlay { align-items: flex-end; padding: 0; }
  .upload-modal { width: 100%; max-height: 92vh; max-height: 92dvh; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); border-radius: 18px 18px 0 0; }
  .preview-box { height: 160px; }
}

@media (max-width: 480px) {
  .upload-modal { padding: 16px 12px calc(16px + env(safe-area-inset-bottom)); }
  .upload-modal h2 { font-size: 1.2rem; }
  .preview-box { height: 140px; }
  .modal-actions { flex-direction: column; }
  .modal-actions > * { width: 100%; min-width: 0; }
}
</style>
