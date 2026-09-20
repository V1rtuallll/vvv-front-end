<template>
  <div class="bgm-picker">
    <div class="bgm-current">
      <span class="bgm-current-label">背景音乐</span>
      <span class="bgm-current-name">{{ currentName }}</span>
      <button class="bgm-toggle-btn" type="button" @click="toggleOpen">
        {{ open ? "收起" : "挑一首" }}
      </button>
      <button v-if="modelValue" class="bgm-clear-btn" type="button" @click="clear">
        取消背景音乐
      </button>
    </div>

    <div v-if="open" class="bgm-panel">
      <div class="bgm-upload">
        <label class="bgm-upload-label">
          <input type="file" :accept="ACCEPT" class="bgm-file-input" @change="onPickFile" />
          <span class="bgm-upload-btn">{{ uploading ? "上传中..." : "上传新文件" }}</span>
        </label>
        <p class="bgm-hint">上传的音频或视频只作为背景音乐，不会出现在画廊列表里。</p>
      </div>

      <p v-if="loading" class="bgm-status">正在加载候选...</p>
      <p v-else-if="candidates.length === 0" class="bgm-status">画廊里还没有可用作背景音乐的资源。</p>
      <ul v-else class="bgm-list">
        <li v-for="item in candidates" :key="item.id" class="bgm-item">
          <span class="bgm-item-label">{{ labelOf(item) }}</span>
          <button class="bgm-audition-btn" type="button" @click="toggleAudition(item)">
            {{ isAuditioning(item) ? "停止" : "试听" }}
          </button>
          <button class="bgm-choose-btn" type="button" @click="choose(item)">选它</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";

import { getGalleryBgmCandidates, uploadGalleryBgm } from "@/modules/gallery/api/galleryApi";
import { resolveBgm, useGalleryBgm } from "@/modules/gallery/composables/useGalleryBgm";

const props = defineProps({
  /** { src, type } 或 null。与 gallery.bgm_src / bgm_type 同形，上层不做转换直接透传 */
  modelValue: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue"]);

// 与 GalleryUploadDialog / GalleryEditDialog 的资源选择用的是同一份白名单
const ACCEPT = ".mp3,.wav,.flac,.aac,.ogg,.mp4,.webm,.avi,.mov,.mkv";

const open = ref(false);
const candidates = ref([]);
const loading = ref(false);
const uploading = ref(false);
const bgm = useGalleryBgm();

const currentName = computed(() => props.modelValue?.src ?? "未设置");

const shortName = (src) => String(src ?? "").split("?")[0].split("/").pop() || "（未知文件）";

/**
 * 候选项的说明文字。
 *
 * 图文项要标出它会贡献哪一首：它自己是一张图，选它得到的却是它配的那首曲子，
 * 不写清楚的话用户不知道选了会发生什么。
 */
const labelOf = (item) => {
  const own = item.title || shortName(item.src);
  if (item.type === "music") return `音乐 · ${own}`;
  if (item.type === "video") return `视频 · ${own}`;
  return `图文项 · ${own}（配的是 ${shortName(resolveBgm(item)?.src)}）`;
};

const loadCandidates = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const res = await getGalleryBgmCandidates();
    candidates.value = res.data || [];
  } catch {
    // 提示由 request.js 负责
  } finally {
    loading.value = false;
  }
};

const toggleOpen = () => {
  open.value = !open.value;
  if (!open.value) {
    // 收起会把面板连同「停止」按钮一起摘掉：声音不能留着而控件没了。
    // 与 choose / clear / onBeforeUnmount 走的是同一步
    bgm.stop();
    return;
  }
  // 只在第一次展开时拉：每次打开编辑弹窗都请求一次是白花的
  if (candidates.value.length === 0) loadCandidates();
};

const isAuditioning = (item) =>
  bgm.activeId.value !== null && String(bgm.activeId.value) === String(item.id);

const toggleAudition = (item) => {
  if (isAuditioning(item)) bgm.stop();
  else bgm.play(item);
};

/** 选它 = 取这一条贡献出来的曲子，不取它自己（图当音源是静音的） */
const choose = (item) => {
  const picked = resolveBgm(item);
  if (!picked) return;
  bgm.stop();
  emit("update:modelValue", picked);
  open.value = false;
};

const clear = () => {
  bgm.stop();
  emit("update:modelValue", null);
};

const onPickFile = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadGalleryBgm(formData);
    emit("update:modelValue", { src: res.data.url, type: res.data.type });
    // 传完直接试听，省得用户再点一次
    bgm.playSource({ src: res.data.url, type: res.data.type });
  } catch {
    // 提示由 request.js 负责
  } finally {
    uploading.value = false;
  }
};

// 弹窗被关掉时组件就卸载了，试听的声音不能留在后台继续响
onBeforeUnmount(() => bgm.stop());
</script>

<style scoped>
/* 与 GalleryEditDialog 的 .edit-field 保持同一套间距与配色 */
.bgm-picker { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; text-align: left; }
.bgm-current { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.bgm-current-label { color: #ffaae6; font-size: 1rem; }
.bgm-current-name { flex: 1 1 180px; min-width: 0; overflow: hidden; color: #cceeff; font-size: 0.9rem; white-space: nowrap; text-overflow: ellipsis; }
.bgm-toggle-btn { min-height: 44px; padding: 8px 18px; color: #000; font-weight: bold; background: #00ffff; border: none; border-radius: 8px; cursor: pointer; }
.bgm-clear-btn { min-height: 44px; padding: 8px 16px; color: #ff69b4; font-size: 0.9rem; background: rgba(255, 105, 180, 0.15); border: 1px solid #ff69b4; border-radius: 8px; cursor: pointer; }

.bgm-panel { display: flex; flex-direction: column; gap: 12px; padding: 14px; background: rgba(0, 0, 0, 0.5); border: 1px solid #00ffff88; border-radius: 10px; }
.bgm-upload { display: flex; flex-direction: column; gap: 8px; }
.bgm-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.bgm-upload-label { width: fit-content; cursor: pointer; }
.bgm-upload-btn { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 18px; color: #00ffff; font-weight: bold; background: rgba(0, 255, 255, 0.12); border: 1px solid #00ffff; border-radius: 8px; }
.bgm-hint { color: #aaa; font-size: 0.85rem; line-height: 1.6; }

.bgm-status { padding: 12px 4px; color: #aaa; font-size: 0.9rem; }
.bgm-list { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; max-height: 260px; overflow-y: auto; }
.bgm-item { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; }
.bgm-item-label { flex: 1 1 200px; min-width: 0; overflow: hidden; color: #cceeff; font-size: 0.9rem; white-space: nowrap; text-overflow: ellipsis; }
.bgm-audition-btn { min-height: 44px; padding: 6px 16px; color: #00ffff; font-size: 0.9rem; background: rgba(0, 255, 255, 0.12); border: 1px solid #00ffff; border-radius: 20px; cursor: pointer; }
.bgm-choose-btn { min-height: 44px; padding: 6px 16px; color: #000; font-size: 0.9rem; font-weight: bold; background: #00ffff; border: none; border-radius: 20px; cursor: pointer; }

/* ==== 窄屏适配：与两个弹窗同一套 ==== */
@media (max-width: 480px) {
  .bgm-current { align-items: stretch; }
  .bgm-toggle-btn,
  .bgm-clear-btn { width: 100%; }
  .bgm-item-label { flex-basis: 100%; }
}
</style>
