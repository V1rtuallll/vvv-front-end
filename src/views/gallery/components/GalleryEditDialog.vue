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

      <!-- 只有音乐项不能配 BGM：后端规则 3 会给 music 项整条请求回 400，
           音乐项自己就是音源。photo / gif / video 都可以，与上传弹窗同一口径 -->
      <GalleryBgmPicker v-if="bgmAllowed" v-model="bgm" />

      <!-- 媒体列表。一条只有文件：标题、描述、BGM 都属于作品本身，不在这里再传一遍 -->
      <div class="edit-field">
        <span class="field-label">媒体（{{ draft.length }} 条）</span>
        <ul class="media-list">
          <li
            v-for="(row, index) in draft"
            :key="row.key"
            class="media-row"
            :class="{
              'is-dragging': draggingKey === row.key,
              'is-drop-target': dropTarget && dropTarget.key === row.key,
              'is-drop-after': dropTarget && dropTarget.key === row.key && !dropTarget.before,
            }"
            @dragover.prevent="onDragOver(row, $event)"
            @drop.prevent="onDrop(row)"
          >
            <span
              class="media-grip"
              draggable="true"
              aria-hidden="true"
              @dragstart="onDragStart(row, $event)"
              @dragend="onDragEnd"
            ></span>
            <img v-if="row.kind === 'image'" :src="row.previewUrl || row.src" class="media-thumb" alt="" />
            <video v-else-if="row.kind === 'video'" :src="row.previewUrl || row.src" class="media-thumb" preload="metadata" muted></video>
            <audio v-else-if="row.kind === 'audio'" :src="row.previewUrl || row.src" class="media-audio" controls></audio>
            <span v-else class="media-thumb media-thumb-text">文件</span>
            <span class="media-name" :title="row.name">{{ row.name }}</span>
            <label class="media-pick">
              <input type="file" :accept="rowAccept" class="media-file-input" @change="onPickFile($event, row)" />
              <span class="media-btn">换文件</span>
            </label>
            <button class="media-btn media-move-up" :disabled="index === 0" @click="move(index, -1)">上移</button>
            <button class="media-btn media-move-down" :disabled="index === draft.length - 1" @click="move(index, 1)">下移</button>
            <button class="media-btn media-remove" :disabled="draft.length === 1" @click="removeRow(row)">删除</button>
          </li>
        </ul>

        <label class="media-add">
          <input type="file" :accept="ACCEPT" class="media-add-input" multiple @change="onAddFiles" />
          <span class="media-btn">添加媒体</span>
        </label>
        <p class="media-hint">改动都先留在本窗口里，点保存才提交；取消则什么都不发生。</p>
      </div>

      <div class="modal-actions">
        <button class="save-btn" :disabled="saving" @click="submit">{{ saving ? "保存中..." : "保存" }}</button>
        <button class="cancel-btn" :disabled="saving" @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";

import GalleryBgmPicker from "@/views/gallery/components/GalleryBgmPicker.vue";
import { coverOf, mediaListOf } from "@/modules/gallery/media";

const props = defineProps({
  visible: Boolean,
  item: { type: Object, default: null },
  saving: Boolean,
});

const emit = defineEmits(["close", "submit"]);

const ACCEPT = ".jpg,.jpeg,.png,.webp,.bmp,.gif,.mp4,.webm,.avi,.mov,.mkv,.mp3,.wav,.flac,.aac,.ogg";

/**
 * 「换文件」那一行的可选扩展名，按这条作品的族收窄。
 *
 * 作品的类型由族决定，跨族换文件会被服务端回 400（换类型要删除后重新上传）。
 * 在选文件这一步就按族过滤，用户拿到的是系统的文件过滤，而不是一条服务端文案 ——
 * 选中之后才被拒的话，他已经把那一步做完了才发现做不成。
 * 「添加媒体」那份清单不收窄：它不限于一行的替换，混族由服务端判。
 */
const ACCEPT_BY_FAMILY = {
  still: ".jpg,.jpeg,.png,.webp,.bmp,.gif",
  video: ".mp4,.webm,.avi,.mov,.mkv",
  audio: ".mp3,.wav,.flac,.aac,.ogg",
};

// 只开放标题与描述。alt / 标签 / 分类目前没有对应的业务场景，先不放进表单。
const EDITABLE_KEYS = ["title", "description"];

const emptyForm = () => EDITABLE_KEYS.reduce((form, key) => ({ ...form, [key]: "" }), {});

const form = ref(emptyForm());
let initialForm = emptyForm();

// { src, type } 或 null。与接口字段同形，不做转换
const bgm = ref(null);
let initialBgm = null;

/** 封面：media 非空时以 media[0] 为准，与服务端同一份规则 */
const cover = computed(() => coverOf(props.item));

/** 只有音乐项不能配 BGM：给音乐项配 BGM 会被后端整条请求回 400（它自己就是音源） */
const bgmAllowed = computed(() => ["photo", "gif", "video"].includes(cover.value.type));

/** 作品族 → 允许换进来的扩展名。划分与后端 sameFamily 一致：photo 与 gif 一族 */
const FAMILY_BY_TYPE = { photo: "still", gif: "still", video: "video", music: "audio" };

/**
 * 每一行「换文件」按这条作品的族过滤。
 *
 * 认不出的类型退回全量清单：宁可让服务端去判，也不要在客户端凭一个猜出来的族
 * 把用户能选的文件挡掉。
 */
const rowAccept = computed(() => ACCEPT_BY_FAMILY[FAMILY_BY_TYPE[cover.value.type]] ?? ACCEPT);

/**
 * 草稿：编辑弹窗里的一切改动都先落在这里，点保存才发出去。
 *
 * 这是刻意的 —— 用户点错的概率远高于点对，而每一次点击都立刻删掉服务端的行与
 * 桶里的对象，是没法撤销的。取消必须等于什么都没发生。
 *
 * 每项 { key, mediaId, src, kind, name, file, previewUrl }。mediaId 与 file 同时存在时
 * 以 file 为准，那是「换文件」：服务端会丢弃原来那一条，只认新的这个文件。
 */
const draft = ref([]);
let nextKey = 1;
/** 打开时的顺序签名；与它一致就说明用户什么都没改 */
let initialOrder = "";

const KIND_BY_TYPE = { photo: "image", gif: "image", video: "video", music: "audio" };

/** 预览只看文件本身是什么；真正的 type 由服务端按文件内容判定 */
const kindOfFile = (file) => {
  const type = file.type || "";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "unknown";
};

const nameOfSrc = (src) => {
  const path = String(src ?? "").split("?")[0];
  return path.substring(path.lastIndexOf("/") + 1) || "（未知文件）";
};

const rowOfMedia = (media) => ({
  key: nextKey++,
  mediaId: media.id ?? null,
  src: media.src ?? null,
  kind: KIND_BY_TYPE[media.type] ?? "unknown",
  name: nameOfSrc(media.src),
  file: null,
  previewUrl: null,
});

/** 换过文件的行记成 new：它跟打开时那一份一定不是同一个状态 */
const orderSignature = () =>
  draft.value.map((row) => (row.file ? "new" : `id:${row.mediaId}`)).join(",");

/**
 * 预览地址占着的是一整份文件，不再用到就立刻放掉：
 * 换文件、移除条目、关掉弹窗、组件卸载四处都要走这里。
 */
const releaseRow = (row) => {
  if (!row?.previewUrl) return;
  URL.revokeObjectURL(row.previewUrl);
  row.previewUrl = null;
};

const clearDraft = () => {
  draft.value.forEach(releaseRow);
  draft.value = [];
};

const syncDraft = (item) => {
  clearDraft();
  draft.value = mediaListOf(item).map(rowOfMedia);
  initialOrder = orderSignature();
};

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
    if (!props.visible) {
      // 关掉就把预览一起放掉，不等下一次打开
      clearDraft();
      return;
    }
    syncForm(props.item);
    syncDraft(props.item);
  },
  { immediate: true },
);

onBeforeUnmount(clearDraft);

const move = (index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= draft.value.length) return;
  [draft.value[index], draft.value[target]] = [draft.value[target], draft.value[index]];
};

/** 作品至少要有一个媒体：删空之后 gallery.src 无处可取，也就没有封面了 */
const removeRow = (row) => {
  if (draft.value.length <= 1) return;
  releaseRow(row);
  draft.value = draft.value.filter((candidate) => candidate.key !== row.key);
};

const toRowOfFile = (file) => ({
  key: nextKey++,
  mediaId: null,
  src: null,
  kind: kindOfFile(file),
  name: file.name,
  file,
  previewUrl: URL.createObjectURL(file),
});

const onPickFile = (event, row) => {
  const file = event.target.files?.[0];
  // 立刻清空 input，否则同一个文件选第二次不会再触发 change
  event.target.value = "";
  if (!file) return;
  // 这一行可能已经换过一次，旧预览先放掉
  releaseRow(row);
  row.file = file;
  row.previewUrl = URL.createObjectURL(file);
  row.kind = kindOfFile(file);
  row.name = file.name;
};

const onAddFiles = (event) => {
  const files = [...(event.target.files ?? [])];
  event.target.value = "";
  if (!files.length) return;
  draft.value.push(...files.map(toRowOfFile));
};

// 拖拽只是额外的便利：原生 draggable 在触屏上不工作，排序主要靠上移 / 下移按钮
//
// 只有握把是可拖的。整行都可拖时，想选中文件名文字就会把它拖起来，
// 而且看不出哪里能拖 —— 一个可见的握把就是「这里能拖」的信号。
const draggingKey = ref(null);
/** 当前悬停的落点 { key, before }。before 为真表示插到那一行前面 */
const dropTarget = ref(null);

/** 指针落在元素的上半还是下半。默认高度取不到时按「后面」处理 */
const isUpperHalf = (event, element) => {
  const rect = element.getBoundingClientRect();
  return event.clientY - rect.top < rect.height / 2;
};

const onDragStart = (row, event) => {
  draggingKey.value = row.key;
  // Firefox 要求 dragstart 里写入数据，否则整个拖拽根本不启动
  if (event.dataTransfer) {
    event.dataTransfer.setData("text/plain", String(row.key));
    event.dataTransfer.effectAllowed = "move";
  }
};

const onDragOver = (row, event) => {
  // 拖到自己身上不算落点
  if (draggingKey.value === null || draggingKey.value === row.key) {
    dropTarget.value = null;
    return;
  }
  dropTarget.value = { key: row.key, before: isUpperHalf(event, event.currentTarget) };
};

/** 拖到列表外、按 Esc 中止都走这里，状态不会留在半道上 */
const onDragEnd = () => {
  draggingKey.value = null;
  dropTarget.value = null;
};

/**
 * 落到悬停时定下的位置：上半插到目标前面，下半插到目标后面。
 *
 * 被拖的条目先从数组里摘出去，它后面的条目因此整体前移一位，所以落点要**现算一次**
 * 目标的下标。原来的实现靠 `to - 1` 硬修，还得为「往下拖一位」那个相邻场景加特例
 * （两条互换），两样在这里都消失了。
 */
const onDrop = (row) => {
  const target = dropTarget.value && dropTarget.value.key === row.key ? dropTarget.value : null;
  const from = draft.value.findIndex((candidate) => candidate.key === draggingKey.value);
  draggingKey.value = null;
  dropTarget.value = null;
  if (target === null || from === -1) return;

  const [moved] = draft.value.splice(from, 1);
  const targetIndex = draft.value.findIndex((candidate) => candidate.key === row.key);
  draft.value.splice(target.before ? targetIndex : targetIndex + 1, 0, moved);
};

const bgmChanged = () => {
  if (!initialBgm && !bgm.value) return false;
  if (!initialBgm || !bgm.value) return true;
  return initialBgm.src !== bgm.value.src || initialBgm.type !== bgm.value.type;
};

const changed = () =>
  EDITABLE_KEYS.some((key) => form.value[key] !== initialForm[key])
  || bgmChanged()
  || orderSignature() !== initialOrder;

const submit = () => {
  // 一个字都没改就别发请求：全量替换会照原样把整组重写一遍，白跑一个事务
  if (!changed()) {
    window.$vmessage.info("未修改任何内容");
    return emit("close");
  }

  const newFiles = [];
  const items = [];
  draft.value.forEach((row) => {
    if (row.file) {
      // 下标按最终顺序现算，files 也就是这个顺序
      items.push({ newFile: newFiles.length });
      newFiles.push(row.file);
      return;
    }
    // 既没有 mediaId 又没有文件的行只可能来自「没有媒体记录」的作品那条兜底封面，
    // 它没有可指认的媒体，发不出去 —— items 会因此缺一条：整条作品一条媒体都发不出去时
    // 由上层拦下，提示说明作品没有媒体文件
    if (row.mediaId != null) items.push({ mediaId: row.mediaId });
  });

  emit("submit", {
    title: form.value.title,
    description: form.value.description,
    // BGM 是一对：两个字段永远都带，没有配就都是 null。只发一边会被服务端
    // 当成参数不完整，而不是「清空」
    bgmSrc: bgm.value?.src ?? null,
    bgmType: bgm.value?.type ?? null,
    items,
    newFiles,
  });
};
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(1, 40, 70, 0.55); backdrop-filter: blur(6px); }
/* width 与 padding 同时存在，必须用 border-box，否则窄屏下弹窗宽度超出视口 */
.edit-modal { box-sizing: border-box; width: min(640px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; padding: 30px; color: #2f3b47; background: #ffffff; border: 1px solid #b9c4cc; border-radius: 4px; }
.edit-modal h2 { margin-bottom: 20px; color: #ff69b4; font-size: 1.6rem; }
.edit-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
.field-label { color: #c2185b; font-size: 1rem; }
.field-input { box-sizing: border-box; width: 100%; min-height: 44px; padding: 12px; color: #2f3b47; font-size: 1rem; background: #e9f2f9; border: 1px solid #b9c4cc; border-radius: 4px; }
.field-textarea { min-height: 80px; resize: vertical; }

/* 媒体列表：一条媒体一行，窄屏自动折行 */
.media-list { margin: 0; padding: 0; list-style: none; }
/* position: relative 是给落点线那条绝对定位的伪元素当参照系的 */
.media-row { position: relative; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 8px 0; border-bottom: 1px solid #e9f2f9; transition: background-color 0.15s ease; }

/* 拖柄。点阵是站点的既有母题（侧栏标题条的小方块、卡片底板都是它）：
   调点的疏密改 background-size，调点的粗细改 radial-gradient 的 1.2px / 1.5px */
.media-grip {
  flex: 0 0 auto;
  width: 22px;
  height: 44px;
  background-image: radial-gradient(circle, #7b8fa1 1.2px, transparent 1.5px);
  background-size: 6px 6px;
  background-position: center;
  border-radius: 4px;
  cursor: grab;
}
.media-grip:hover { background-image: radial-gradient(circle, #0277bd 1.2px, transparent 1.5px); }
.media-grip:active { cursor: grabbing; }

/* 被拖起的那一行：淡下去，加一条虚线框表示它正在被搬动 */
.media-row.is-dragging { opacity: 0.45; background: #e9f2f9; border-bottom-color: transparent; }
.media-row.is-dragging .media-grip { outline: 1px dashed #0277bd; outline-offset: -1px; }

/* 落点行：底色亮一层，再用一条 2px 的线指出插到前面还是后面。
   线画在绝对定位的伪元素上 —— 直接改 border 会让整行抖一下，
   而伪元素不会成为 flex 项，不影响原来的排版 */
.media-row.is-drop-target { background: #e9f2f9; }
.media-row.is-drop-target::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: #0277bd;
}
.media-row.is-drop-target:not(.is-drop-after)::after { bottom: auto; top: -1px; }
.media-thumb { flex: 0 0 auto; width: 56px; height: 56px; object-fit: contain; background: #e9f2f9; border-radius: 4px; }
/* 音频与未知类型没有画面，用文字占位，与缩略图同高 */
.media-thumb-text { display: flex; align-items: center; justify-content: center; color: #54636f; font-size: 0.85rem; }
.media-audio { flex: 1 1 160px; min-width: 120px; height: 32px; }
.media-name { flex: 1 1 140px; min-width: 0; overflow: hidden; color: #54636f; font-size: 0.92rem; white-space: nowrap; text-overflow: ellipsis; }
.media-file-input, .media-add-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.media-pick { flex: 0 0 auto; cursor: pointer; }
/* 触摸目标不小于 44px */
.media-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 8px 14px; color: #0277bd; font-size: 0.9rem; background: #ffffff; border: 1px solid #0277bd; border-radius: 4px; cursor: pointer; }
.media-btn:disabled { color: #b9c4cc; border-color: #b9c4cc; cursor: not-allowed; }
.media-remove:not(:disabled) { color: #ff69b4; border-color: #ff69b4; }
.media-add { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.media-hint { margin-top: 8px; color: #7b8fa1; font-size: 0.85rem; line-height: 1.6; }

.modal-actions { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
.modal-actions button { min-height: 44px; padding: 10px 24px; font-size: 1rem; border-radius: 4px; cursor: pointer; }
.save-btn { color: #ffffff; font-weight: bold; background: #0277bd; border: 1px solid #b9c4cc; }
.cancel-btn { color: #ff69b4; background: rgba(255, 105, 180, 0.2); border: 2px solid #ff69b4; }
.modal-actions button:disabled { opacity: 0.6; cursor: not-allowed; }

/* ==== 窄屏适配 ==== */
@media (max-width: 768px) {
  .modal-overlay { align-items: flex-end; padding: 0; }
  .edit-modal { width: 100%; max-height: 92vh; max-height: 92dvh; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); border-radius: 4px; }
  /* 名字与按钮各占一行，按钮才排得开 */
  .media-name { flex: 1 1 100%; white-space: normal; word-break: break-all; }
}

@media (max-width: 480px) {
  .edit-modal { padding: 16px 12px calc(16px + env(safe-area-inset-bottom)); }
  .edit-modal h2 { font-size: 1.3rem; }
  .modal-actions { flex-direction: column; }
  .modal-actions button { width: 100%; }
}
</style>
