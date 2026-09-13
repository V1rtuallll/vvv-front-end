<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="upload-modal" @click.stop>
      <h2>上传到Gallery</h2>
      <div class="upload-area">
        <label class="file-label">
          <span>选择文件（支持多选）</span>
          <input
            type="file"
            multiple
            :accept="ACCEPT"
            class="hidden-input"
            @change="$emit('select-files', $event)"
          />
          <span class="select-btn">选择文件</span>
        </label>
        <p v-if="limitText" class="limit-tip">{{ limitText }}</p>
      </div>

      <div v-if="items.length > 0" class="overall">
        <div class="progress-track">
          <div class="progress-fill overall-fill" :style="{ width: overallProgress + '%' }"></div>
        </div>
        <span class="overall-text">
          总进度 {{ overallProgress }}%
          <template v-if="successCount || failedCount">
            （成功 {{ successCount }}<template v-if="failedCount">，失败 {{ failedCount }}</template>）
          </template>
        </span>
      </div>

      <div v-if="items.length > 0" class="preview-list">
        <div v-for="item in items" :key="item.key" class="preview-item" :class="'status-' + item.status">
          <div class="thumb-wrapper">
            <img v-if="item.preview && isImage(item)" :src="item.preview" class="thumb" />
            <video v-else-if="item.preview && isVideo(item)" :src="item.preview" class="thumb"></video>
            <audio v-else-if="item.preview && isAudio(item)" :src="item.preview" controls class="thumb"></audio>
            <div v-else class="thumb-placeholder">{{ item.name }}</div>
          </div>

          <input
            v-model="item.title"
            :disabled="!isEditable(item)"
            placeholder="标题（默认文件名）"
            class="title-input"
          />
          <textarea
            v-model="item.description"
            :disabled="!isEditable(item)"
            placeholder="写点描述"
            class="desc-input"
          ></textarea>

          <div class="progress-track">
            <div class="progress-fill" :class="'fill-' + item.status" :style="{ width: item.progress + '%' }"></div>
          </div>
          <div class="item-status">
            <span class="status-text">{{ statusText(item) }}</span>
            <button v-if="item.status === 'uploading'" class="item-btn" @click="$emit('cancel', item)">取消</button>
            <button
              v-else-if="item.status === 'failed' || item.status === 'cancelled'"
              class="item-btn"
              @click="$emit('retry', item)"
            >
              重试
            </button>
            <button v-else-if="item.status === 'success'" class="item-btn" @click="$emit('remove', item)">移除</button>
          </div>
          <p v-if="item.error" class="error-text">{{ item.error }}</p>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="$emit('upload')" :disabled="!canUpload" class="crt-btn">
          {{ hasUnfinished ? "上传中..." : "确认上传" }}
        </button>
        <button v-if="failedCount > 1" @click="$emit('retry-all')" class="crt-mini-btn">重试全部失败项</button>
        <button @click="$emit('close')" class="crt-mini-btn danger">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const ACCEPT = ".jpg,.jpeg,.png,.webp,.bmp,.gif,.mp4,.webm,.avi,.mov,.mkv,.mp3,.wav,.flac,.aac,.ogg";

defineProps({
  visible: Boolean,
  /** useUploadQueue 的 items：每个文件的状态、进度与错误 */
  items: { type: Array, default: () => [] },
  /** 来自后端配置的大小上限提示 */
  limitText: { type: String, default: "" },
  overallProgress: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  hasUnfinished: Boolean,
  canUpload: Boolean,
});

defineEmits(["close", "select-files", "upload", "retry", "retry-all", "cancel", "remove"]);

const typeOf = (item) => item.file?.type || "";

// 只有排队中的文件还能改标题和描述：已经提交过的改动不算数
const isEditable = (item) => item.status === "queued";

const isImage = (item) => typeOf(item).startsWith("image");
const isVideo = (item) => typeOf(item).startsWith("video");
const isAudio = (item) => typeOf(item).startsWith("audio");

const STATUS_TEXT = {
  queued: "等待上传",
  uploading: "上传中",
  failed: "上传失败",
  cancelled: "已取消",
};

const statusText = (item) => {
  if (item.status === "success") {
    // 服务端告诉我们是这次传的，还是之前已经传过的那一份
    return item.resource?.status === "duplicate" ? "已存在，未重复上传" : "已完成";
  }
  if (item.status === "uploading") return `上传中 ${item.progress}%`;
  return STATUS_TEXT[item.status] || item.status;
};
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0, 0, 0, 0.96); backdrop-filter: blur(15px); }
/* width 与 padding 同时存在，必须用 border-box，否则窄屏下弹窗宽度超出视口 */
.upload-modal { box-sizing: border-box; width: min(960px, 100%); max-height: calc(100vh - 40px); overflow: auto; padding: 30px; color: #00ffff; background: rgba(0, 0, 20, 0.98); border: 2px solid #00ffff; border-radius: 15px; box-shadow: 0 0 30px #00ffff88; }
.file-label { display: flex; flex-direction: column; gap: 12px; cursor: pointer; }
.hidden-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
/* 触摸目标不小于 44px */
.select-btn { width: fit-content; min-height: 44px; display: inline-flex; align-items: center; padding: 10px 18px; color: #000; font-weight: bold; background: #00ffff; border-radius: 6px; }
.limit-tip { margin-top: 10px; color: #ffaae6; font-size: 0.9rem; }

.overall { display: flex; flex-direction: column; gap: 6px; margin-top: 20px; }
.overall-text { color: #ffaae6; font-size: 0.9rem; }

/* minmax 用 min(100%, 300px)，保证容器再窄也不会撑出横向滚动 */
.preview-list { max-height: 60vh; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 25px; margin: 30px 0; padding: 10px; overflow-y: auto; }
.preview-item { display: flex; flex-direction: column; gap: 12px; padding: 15px; background: rgba(0, 0, 0, 0.5); border-radius: 15px; box-shadow: 0 0 15px rgba(255, 105, 180, 0.3); }
.preview-item.status-success { border: 1px solid #00ffff; }
.preview-item.status-failed { border: 1px solid #ff69b4; }
/* 预览区固定高度，不随文件尺寸变化 */
.thumb-wrapper { display: flex; align-items: center; justify-content: center; width: 100%; height: 220px; overflow: hidden; background: rgba(0, 0, 0, 0.6); border-radius: 10px; }
.thumb { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
.thumb-placeholder { padding: 20px; color: #00ffff; text-align: center; word-break: break-all; }
.title-input, .desc-input { box-sizing: border-box; width: 100%; min-height: 44px; padding: 12px; color: #00ffff; font-size: 1rem; background: rgba(0, 0, 0, 0.6); border: 1px solid #00ffff88; border-radius: 10px; }
.desc-input { min-height: 80px; resize: vertical; }
.title-input:disabled, .desc-input:disabled { opacity: 0.5; cursor: not-allowed; }

.progress-track { width: 100%; height: 8px; overflow: hidden; background: rgba(0, 255, 255, 0.15); border-radius: 4px; }
.progress-fill { height: 100%; width: 0; background: #00ffff; transition: width 0.2s ease; }
.fill-success { background: #00ffff; }
.fill-failed { background: #ff69b4; }
.fill-cancelled { background: #888; }
.overall-fill { background: #ff69b4; }

.item-status { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.status-text { color: #cceeff; font-size: 0.9rem; }
.item-btn { min-height: 32px; padding: 4px 14px; color: #00ffff; font-size: 0.9rem; background: rgba(0, 255, 255, 0.15); border: 1px solid #00ffff; border-radius: 20px; cursor: pointer; }
.error-text { color: #ff69b4; font-size: 0.88rem; line-height: 1.5; word-break: break-word; }

.modal-actions { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
.modal-actions button { min-height: 44px; padding: 10px 24px; font-size: 1rem; }

/* ==== 窄屏适配 ====
   <=768px：弹窗改为底部面板，占满宽度、贴着屏幕下沿；
   <=480px：预览列表改单列，按钮纵向铺满。
*/
@media (max-width: 768px) {
  .modal-overlay { align-items: flex-end; padding: 0; }
  .upload-modal { width: 100%; max-height: 92vh; max-height: 92dvh; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); border-radius: 18px 18px 0 0; }
  .preview-list { gap: 16px; margin: 20px 0; padding: 0; }
  .thumb-wrapper { height: 160px; }
}

@media (max-width: 480px) {
  .upload-modal { padding: 16px 12px calc(16px + env(safe-area-inset-bottom)); }
  .upload-modal h2 { font-size: 1.2rem; margin-bottom: 12px; }
  .preview-list { grid-template-columns: 1fr; gap: 14px; }
  .thumb-wrapper { height: 140px; }
  .preview-item { padding: 12px; }
  .modal-actions { flex-direction: column; }
  .modal-actions button { width: 100%; }
}
</style>
