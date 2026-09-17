<template>
  <span class="media-picker">
    <button class="crt-mini-btn picker-btn" :disabled="busy" @click="openPicker">
      {{ busy ? `上传中 ${progress}%` : label }}
    </button>
    <!-- 隐藏的文件输入：点按钮才唤起系统选择框 -->
    <input ref="inputEl" class="picker-input" type="file" :accept="accept" @change="onFileChange" />
  </span>
</template>

<script setup>
import { ref } from "vue";

import { uploadBlogMedia } from "@/modules/blog/api/blogApi";

const props = defineProps({
  label: { type: String, default: "插入图片 / 视频" },
  // 相册默认只收图片与视频；后端还有一道魔数与类型的校验
  accept: { type: String, default: "image/*,video/*" },
});

const emit = defineEmits(["picked"]);

const inputEl = ref(null);
const busy = ref(false);
const progress = ref(0);

const openPicker = () => {
  if (busy.value) return;
  inputEl.value?.click();
};

const onFileChange = async (event) => {
  const file = event.target.files?.[0];
  // 同一个文件连选两次也要能触发 change
  event.target.value = "";
  if (!file) return;

  const kind = file.type.startsWith("video/") ? "video" : "image";
  const formData = new FormData();
  formData.append("file", file);

  busy.value = true;
  progress.value = 0;
  try {
    const res = await uploadBlogMedia(formData, (e) => {
      if (e?.total) progress.value = Math.round((e.loaded / e.total) * 100);
    });
    // 后端把 OSS 公开地址放在 data 里
    emit("picked", { kind, url: res.data, name: file.name });
  } catch {
    // 提示由 request.js 负责（含后端返回的「博客仅支持图片、GIF 和视频」）
  } finally {
    busy.value = false;
    progress.value = 0;
  }
};
</script>

<style scoped>
.media-picker {
  display: inline-flex;
}

/* 隐藏而不是 display:none：display:none 的输入框在部分浏览器里无法被 click() 唤起 */
.picker-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.picker-btn {
  min-height: 36px;
}

@media (max-width: 768px) {
  .picker-btn {
    min-height: 44px;
  }
}
</style>
