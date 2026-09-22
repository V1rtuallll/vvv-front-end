<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="upload-modal" @click.stop>
      <h2>上传到Gallery</h2>

      <div class="upload-area">
        <label class="file-label">
          <span>选择文件（可多选）</span>
          <input type="file" :accept="ACCEPT" class="hidden-input" multiple @change="onPickFiles" />
          <span class="select-btn">选择文件</span>
        </label>
        <p v-if="limitText" class="limit-tip">{{ limitText }}</p>
      </div>

      <template v-if="files.length">
        <!-- 一次发表是一个作品，作品里可以有多个文件；标题与描述属于作品本身，不随文件数量变化 -->
        <ul class="batch-list">
          <li v-for="entry in files" :key="entry.key" class="file-row">
            <img v-if="entry.kind === 'image'" :src="entry.previewUrl" class="file-thumb" alt="" />
            <video
              v-else-if="entry.kind === 'video'"
              :src="entry.previewUrl"
              class="file-thumb"
              preload="metadata"
              muted
            ></video>
            <audio v-else-if="entry.kind === 'audio'" :src="entry.previewUrl" class="file-audio" controls></audio>
            <span v-else class="file-thumb file-thumb-text">文件</span>
            <span class="file-name">{{ entry.name }}</span>
            <button class="crt-mini-btn danger file-remove" type="button" @click="removeFile(entry)">移除</button>
          </li>
        </ul>

        <label class="edit-field">
          <span class="field-label">标题</span>
          <input v-model="title" class="crt-input" placeholder="默认用文件名" />
        </label>

        <label class="edit-field">
          <span class="field-label">描述</span>
          <textarea v-model="description" class="crt-input" placeholder="写点描述"></textarea>
        </label>

        <!-- 静图与视频批次能配 BGM。音乐批次不行：那条项自己就是音源，
             后端规则 3 会给整条请求回 400，而上传路径上那意味着文件根本没传上去 -->
        <GalleryBgmPicker v-if="bgmAllowed" v-model="bgm" />
      </template>

      <div class="modal-actions">
        <button class="crt-btn" :disabled="!files.length" @click="publish">发表</button>
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

// 一次上传对应一个作品，所以批次里可以有多个文件：每项
// { key, file, kind, family, name, previewUrl }
const files = ref([]);
const title = ref("");
const description = ref("");
let nextKey = 1;

// 随作品配的背景音乐 { src, type } 或 null，形状与接口字段一致，不做转换
const bgm = ref(null);

const EXTENSION_KIND = {
  mp4: "video", webm: "video", avi: "video", mov: "video", mkv: "video",
  gif: "image", jpg: "image", jpeg: "image", png: "image", webp: "image", bmp: "image",
  mp3: "audio", wav: "audio", flac: "audio", aac: "audio", ogg: "audio",
};

const kindOf = (name) => {
  const dot = name.lastIndexOf(".");
  return EXTENSION_KIND[dot > 0 ? name.substring(dot + 1).toLowerCase() : ""] ?? "unknown";
};

/**
 * 一个作品里的媒体必须同族，划分与后端的 sameFamily 一致：
 * 静图是一族（jpg / png / webp / gif 都在 image 这一档里），video 与 audio 各自一族。
 */
const toFamily = (kind) => (kind === "image" ? "still" : kind);

/** 批次只有一族（混族在选文件时就整体退回了），取第一个就够 */
const batchFamily = computed(() => files.value[0]?.family ?? null);
const bgmAllowed = computed(() => batchFamily.value === "still" || batchFamily.value === "video");

// 选曲面板收起时曲子必须一起清掉：留着它用户既看不到面板、也没有入口取消，
// 发表时却会被后端整条拒掉，还看不出是哪一步的问题
watch(batchFamily, (family) => {
  if (family !== "still" && family !== "video") bgm.value = null;
});

const releasePreview = (entry) => {
  if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
};

const releasePreviews = () => files.value.forEach(releasePreview);

const clearBatch = () => {
  releasePreviews();
  files.value = [];
};

const reset = () => {
  clearBatch();
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

onBeforeUnmount(releasePreviews);

const onPickFiles = (event) => {
  const picked = [...(event.target.files ?? [])];
  event.target.value = "";
  if (!picked.length) return;

  const entries = picked.map((file) => {
    const kind = kindOf(file.name);
    return { file, kind, family: toFamily(kind), name: file.name };
  });

  // 混族整体退回，而不是只收下同族的那几个：用户得看得见自己选的哪些没进去，
  // 而且一批文件要放进同一个作品，不是各建一个
  const family = files.value.length ? batchFamily.value : entries[0].family;
  if (entries.some((entry) => entry.family !== family)) {
    return window.$vmessage.warning("一次只能上传同一类的文件");
  }

  files.value.push(...entries.map((entry) => ({
    ...entry,
    key: nextKey++,
    previewUrl: URL.createObjectURL(entry.file),
  })));
};

const removeFile = (entry) => {
  releasePreview(entry);
  files.value = files.value.filter((candidate) => candidate.key !== entry.key);
};

const publish = () => {
  if (!files.value.length) return;
  emit("publish", {
    files: files.value.map((entry) => ({ ...entry })),
    title: title.value.trim(),
    description: description.value.trim(),
    bgm: bgm.value,
  });
  reset();
};
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(1, 40, 70, 0.55); backdrop-filter: blur(6px); }
/* width 与 padding 同时存在，必须用 border-box，否则窄屏下弹窗宽度超出视口 */
.upload-modal { box-sizing: border-box; width: min(640px, 100%); max-height: calc(100vh - 40px); overflow: auto; padding: 30px; color: #2f3b47; background: #ffffff; border: 1px solid #b9c4cc; border-radius: 4px; }
.upload-modal h2 { margin-bottom: 20px; color: #ff69b4; font-size: 1.6rem; }
.file-label { display: flex; flex-direction: column; gap: 12px; cursor: pointer; }
.hidden-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
/* 触摸目标不小于 44px */
.select-btn { width: fit-content; min-height: 44px; display: inline-flex; align-items: center; padding: 10px 18px; color: #ffffff; font-weight: bold; background: #0277bd; border-radius: 6px; }
.limit-tip { margin-top: 10px; color: #c2185b; font-size: 0.9rem; }

/* 批次列表：一行一份文件，缩略图 + 名字 + 移除 */
.batch-list { margin: 20px 0 0; padding: 0; list-style: none; }
.file-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #e9f2f9; }
.file-thumb { flex: 0 0 auto; width: 56px; height: 56px; object-fit: contain; background: #e9f2f9; border-radius: 4px; }
/* 音频与未知类型没有画面，用文字占位，与缩略图同宽 */
.file-thumb-text { display: flex; align-items: center; justify-content: center; color: #54636f; font-size: 0.85rem; }
.file-audio { flex: 0 0 auto; width: 200px; height: 32px; }
.file-name { flex: 1 1 auto; min-width: 0; color: #2f3b47; word-break: break-all; }
.file-remove { flex: 0 0 auto; margin: 0; }

.edit-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; text-align: left; }
.field-label { color: #c2185b; font-size: 1rem; }

.modal-actions { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
/* 两个按钮尺寸完全一致，只靠颜色区分主次 */
.modal-actions > * { flex: 0 0 auto; min-width: 180px; margin: 0; }

/* ==== 窄屏适配 ==== */
@media (max-width: 768px) {
  .modal-overlay { align-items: flex-end; padding: 0; }
  .upload-modal { width: 100%; max-height: 92vh; max-height: 92dvh; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); border-radius: 4px; }
  /* 音频播放器窄屏上占满一行，名字与移除按钮另起一行 */
  .file-row { flex-wrap: wrap; }
  .file-audio { width: 100%; }
}

@media (max-width: 480px) {
  .upload-modal { padding: 16px 12px calc(16px + env(safe-area-inset-bottom)); }
  .upload-modal h2 { font-size: 1.2rem; }
  .modal-actions { flex-direction: column; }
  .modal-actions > * { width: 100%; min-width: 0; }
}
</style>
