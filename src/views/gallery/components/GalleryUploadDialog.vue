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
            accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.mp4,.webm,.avi,.mov,.mkv,.mp3,.wav,.flac,.aac,.ogg"
            class="hidden-input"
            @change="$emit('select-files', $event)"
          />
          <span class="select-btn">选择文件</span>
        </label>
      </div>

      <div v-if="files.length > 0" class="preview-list">
        <div v-for="(file, index) in files" :key="index" class="preview-item">
          <div class="thumb-wrapper">
            <img v-if="file.preview && file.type.startsWith('image')" :src="file.preview" class="thumb" />
            <video v-else-if="file.type.startsWith('video')" :src="file.preview" class="thumb"></video>
            <audio v-else-if="file.type.startsWith('audio')" :src="file.preview" controls class="thumb"></audio>
            <div v-else class="thumb-placeholder">{{ file.name }}</div>
          </div>
          <input v-model="file.title" placeholder="标题（默认文件名）" class="title-input" />
          <textarea v-model="file.description" placeholder="写点描述" class="desc-input"></textarea>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="$emit('upload')" :disabled="uploading || files.length === 0" class="crt-btn">
          {{ uploading ? "上传中..." : "确认上传" }}
        </button>
        <button @click="$emit('close')" class="crt-mini-btn danger">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: Boolean,
  files: { type: Array, default: () => [] },
  uploading: Boolean,
});

defineEmits(["close", "select-files", "upload"]);
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0, 0, 0, 0.96); backdrop-filter: blur(15px); }
/* width 与 padding 同时存在，必须用 border-box，否则窄屏下弹窗宽度超出视口 */
.upload-modal { box-sizing: border-box; width: min(960px, 100%); max-height: calc(100vh - 40px); overflow: auto; padding: 30px; color: #00ffff; background: rgba(0, 0, 20, 0.98); border: 2px solid #00ffff; border-radius: 15px; box-shadow: 0 0 30px #00ffff88; }
.file-label { display: flex; flex-direction: column; gap: 12px; cursor: pointer; }
.hidden-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
/* 触摸目标不小于 44px */
.select-btn { width: fit-content; min-height: 44px; display: inline-flex; align-items: center; padding: 10px 18px; color: #000; font-weight: bold; background: #00ffff; border-radius: 6px; }
/* minmax 用 min(100%, 300px)，保证容器再窄也不会撑出横向滚动 */
.preview-list { max-height: 60vh; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 25px; margin: 30px 0; padding: 10px; overflow-y: auto; }
.preview-item { display: flex; flex-direction: column; gap: 12px; padding: 15px; background: rgba(0, 0, 0, 0.5); border-radius: 15px; box-shadow: 0 0 15px rgba(255, 105, 180, 0.3); }
/* 预览区固定高度，不随文件尺寸变化 */
.thumb-wrapper { display: flex; align-items: center; justify-content: center; width: 100%; height: 220px; overflow: hidden; background: rgba(0, 0, 0, 0.6); border-radius: 10px; }
.thumb { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
.thumb-placeholder { padding: 20px; color: #00ffff; text-align: center; word-break: break-all; }
.title-input, .desc-input { box-sizing: border-box; width: 100%; min-height: 44px; padding: 12px; color: #00ffff; font-size: 1rem; background: rgba(0, 0, 0, 0.6); border: 1px solid #00ffff88; border-radius: 10px; }
.desc-input { min-height: 80px; resize: vertical; }
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
