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
      <div class="bgm-tabs" role="tablist">
        <button
          v-for="item in TABS"
          :key="item.key"
          type="button"
          role="tab"
          :aria-selected="tab === item.key"
          :class="['bgm-tab', `bgm-tab-${item.key}`, { 'is-active': tab === item.key }]"
          @click="tab = item.key"
        >{{ item.label }}</button>
      </div>

      <!-- 本站曲库：构建期扫 public/music 的全量，不受后台播放器配置影响。
           这里的 ul 不挂 bgm-list —— 那个 class 在测试里就是「画廊候选列表」的判据，
           挂上去会让「切到画廊才出现」的断言永远为真。样式靠 .bgm-site-list 并到同一条规则里 -->
      <ul v-if="tab === 'site'" class="bgm-site-list">
        <li v-for="name in siteTracks" :key="name" class="bgm-item">
          <span class="bgm-item-label bgm-site-name">{{ formatTrackName(name) }}</span>
          <button class="bgm-audition-btn bgm-site-audition" type="button" @click="toggleSite(name)">
            {{ isAuditioningSite(name) ? "停止" : "试听" }}
          </button>
          <button class="bgm-choose-btn bgm-site-choose" type="button" @click="chooseSite(name)">选它</button>
        </li>
      </ul>

      <div v-else-if="tab === 'upload'" class="bgm-upload">
        <label class="bgm-upload-label">
          <input type="file" :accept="ACCEPT" class="bgm-file-input" @change="onPickFile" />
          <span class="bgm-upload-btn">{{ uploading ? "上传中..." : "上传新文件" }}</span>
        </label>
        <p class="bgm-hint">上传的音频或视频只作为背景音乐，不会出现在画廊列表里。</p>
      </div>

      <template v-else>
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
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";

import { getGalleryBgmCandidates, uploadGalleryBgm } from "@/modules/gallery/api/galleryApi";
import { resolveBgm, useGalleryBgm } from "@/modules/gallery/composables/useGalleryBgm";
import { buildTimeTracks } from "@/modules/player/playlist";
import { formatTrackName } from "@/modules/player/trackName";

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

/**
 * 三段名单来源不同：本站曲库是构建期扫到的全部自带音乐，我的上传是随传随用，
 * 画廊作品是库里已有的音源。默认停在本站曲库 —— 它是「挑一首歌」最直接的入口。
 */
const TABS = [
  { key: "site", label: "本站曲库" },
  { key: "upload", label: "我的上传" },
  { key: "gallery", label: "画廊作品" },
];

const tab = ref("site");
const siteTracks = ref([...buildTimeTracks]);

const siteSrc = (name) => `/music/${name}`;
const siteId = (name) => `site:${name}`;

const isAuditioningSite = (name) => String(bgm.activeId.value) === siteId(name);

const toggleSite = (name) => {
  if (isAuditioningSite(name)) bgm.stop();
  else bgm.playSource({ src: siteSrc(name), type: "audio" }, siteId(name));
};

const chooseSite = (name) => {
  bgm.stop();
  emit("update:modelValue", { src: siteSrc(name), type: "audio" });
  open.value = false;
};

const currentName = computed(() => props.modelValue?.src ?? "未设置");

const shortName = (src) => String(src ?? "").split("?")[0].split("/").pop() || "（未知文件）";

/**
 * 候选项的说明文字：类型 · 标题。
 *
 * 图文项这一支曾经还缀着「（配的是 某某文件）」。那个名字取自上传时的对象键，
 * 多是一串 UUID，既认不出来又把标题挤没了。选图文项会得到它配的那一首，
 * 这件事在 `choose` 里由试听与最终发出的曲子体现，标签上不再展开。
 */
const labelOf = (item) => {
  const own = item.title || shortName(item.src);
  if (item.type === "music") return `音乐 · ${own}`;
  if (item.type === "video") return `视频 · ${own}`;
  return `图文项 · ${own}`;
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
.bgm-current-label { color: #c2185b; font-size: 1rem; }
.bgm-current-name { flex: 1 1 180px; min-width: 0; overflow: hidden; color: #54636f; font-size: 0.9rem; white-space: nowrap; text-overflow: ellipsis; }
.bgm-toggle-btn { min-height: 44px; padding: 8px 18px; color: #ffffff; font-weight: bold; background: #0277bd; border: none; border-radius: 4px; cursor: pointer; }
.bgm-clear-btn { min-height: 44px; padding: 8px 16px; color: #ff69b4; font-size: 0.9rem; background: #ffffff; border: 1px solid #ff69b4; border-radius: 4px; cursor: pointer; }

.bgm-panel { display: flex; flex-direction: column; gap: 12px; padding: 14px; background: #e9f2f9; border: 1px solid #b9c4cc; border-radius: 4px; }

/* tab 栏。做法取自站点顶部导航条：手搓 flex + 大写大字距 + 竖分隔线，
   选中态填 #0277bd 白字。站内没有可复用的 tab 组件，这是既有做法 */
.bgm-tabs { display: flex; border: 1px solid #b9c4cc; border-radius: 4px; overflow: hidden; }
.bgm-tab {
  flex: 1;
  min-height: 44px;
  padding: 10px 6px;
  font-family: "Michroma", "Eurostile", sans-serif;
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  color: #0277bd;
  background: #ffffff;
  border: none;
  border-right: 1px solid rgba(1, 87, 155, 0.15);
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}
.bgm-tab:last-child { border-right: none; }
.bgm-tab:hover { color: #01579b; background-color: rgba(2, 119, 189, 0.12); }
.bgm-tab.is-active { color: #ffffff; background-color: #0277bd; }

.bgm-upload { display: flex; flex-direction: column; gap: 8px; }
.bgm-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.bgm-upload-label { width: fit-content; cursor: pointer; }
.bgm-upload-btn { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 18px; color: #2f3b47; font-weight: bold; background: #ffffff; border: 1px solid #0277bd; border-radius: 4px; }
.bgm-hint { color: #7b8fa1; font-size: 0.85rem; line-height: 1.6; }

.bgm-status { padding: 12px 4px; color: #7b8fa1; font-size: 0.9rem; }
.bgm-list, .bgm-site-list { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; max-height: 260px; overflow-y: auto; }
.bgm-item { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px; background: #e9f2f9; border-radius: 4px; }
.bgm-item-label { flex: 1 1 200px; min-width: 0; overflow: hidden; color: #54636f; font-size: 0.9rem; white-space: nowrap; text-overflow: ellipsis; }
.bgm-audition-btn { min-height: 44px; padding: 6px 16px; color: #2f3b47; font-size: 0.9rem; background: #ffffff; border: 1px solid #0277bd; border-radius: 4px; cursor: pointer; }
.bgm-choose-btn { min-height: 44px; padding: 6px 16px; color: #ffffff; font-size: 0.9rem; font-weight: bold; background: #0277bd; border: none; border-radius: 4px; cursor: pointer; }

/* ==== 窄屏适配：与两个弹窗同一套 ==== */
@media (max-width: 480px) {
  .bgm-current { align-items: stretch; }
  .bgm-toggle-btn,
  .bgm-clear-btn { width: 100%; }
  .bgm-item-label { flex-basis: 100%; }
}
</style>
