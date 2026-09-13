<template>
  <section class="admin-section quick-actions">
    <h3 class="section-title">快速资源管理</h3>
    <div class="action-buttons">
      <button @click="$emit('sync')" class="crt-btn sync-btn" :disabled="syncing">
        {{ syncing ? "同步中..." : "一键同步 OSS → 数据库" }}
      </button>

      <div class="upload-area">
        <label class="crt-file-label">
          <span>批量上传文件（自动识别类型，支持多选）</span>
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.mp4,.webm,.avi,.mov,.mkv,.mp3,.wav,.flac,.aac,.ogg"
            class="hidden-file-input"
            :disabled="uploading"
            @change="$emit('select-files', $event)"
          />
          <span class="crt-mini-btn upload-btn" :class="{ disabled: uploading }">
            选择文件（可多选）
          </span>
        </label>

        <!-- 选完只是排队，确认之后才开始上传 -->
        <p v-if="pendingCount > 0 && !uploading" class="upload-status">
          已选 {{ pendingCount }} 个文件，确认后才会开始上传。
        </p>
        <button
          v-if="pendingCount > 0 && !uploading"
          class="crt-btn start-upload-btn"
          @click="$emit('upload')"
        >
          开始上传（{{ pendingCount }} 个）
        </button>

        <p v-if="uploading" class="upload-status">
          正在上传，总进度 {{ uploadOverallProgress }}%
        </p>

        <div v-if="uploadItems.length > 0" class="upload-results">
          <h4>
            本次上传结果
            <template v-if="uploadFailedCount">
              （成功 {{ uploadSuccessCount }}，失败 {{ uploadFailedCount }}）
            </template>
          </h4>
          <ul>
            <li v-for="item in uploadItems" :key="item.key">
              <span class="status-icon" :class="item.status">
                {{ item.status === "success" ? "✓" : item.status === "failed" ? "✗" : "→" }}
              </span>
              <span class="file-name">{{ item.name }}</span>
              <div class="file-progress">
                <div class="progress-track">
                  <div class="progress-fill" :class="'fill-' + item.status" :style="{ width: item.progress + '%' }"></div>
                </div>
                <span class="progress-text">
                  {{ item.status === "success" ? "已完成" : item.status === "uploading" ? item.progress + "%" : "" }}
                </span>
              </div>
              <a v-if="item.resource?.url" :href="item.resource.url" target="_blank">{{ item.resource.url }}</a>
              <span v-else-if="item.error" class="error-msg">{{ item.error }}</span>
              <button
                v-if="item.status === 'failed' || item.status === 'cancelled'"
                class="crt-mini-btn"
                @click="$emit('retry', item)"
              >
                重试
              </button>
            </li>
          </ul>
          <div class="result-actions">
            <button v-if="uploadFailedCount > 1" @click="$emit('retry-all')" class="crt-mini-btn">重试全部失败项</button>
            <button @click="$emit('clear-results')" class="crt-mini-btn">清空结果</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  syncing: Boolean,
  /** 还有文件在上传 */
  uploading: Boolean,
  /** useUploadQueue 的 items：每个文件的状态与进度 */
  uploadItems: { type: Array, default: () => [] },
  uploadOverallProgress: { type: Number, default: 0 },
  uploadSuccessCount: { type: Number, default: 0 },
  uploadFailedCount: { type: Number, default: 0 },
});

defineEmits(["sync", "select-files", "upload", "retry", "retry-all", "clear-results"]);

/** 已选但还没开始上传的文件数：有值时才显示「开始上传」 */
const pendingCount = computed(
  () => props.uploadItems.filter((item) => item.status === "queued").length,
);
</script>

<style scoped>
.admin-section {
  margin: 50px 0;
  padding: 30px;
  background: rgba(5, 5, 20, 0.6);
  border: 1px solid #00ffff44;
  border-radius: 12px;
}

.quick-actions {
  background: rgba(20, 0, 30, 0.65);
  border-color: #ff00ff55;
}

/* 逐文件上传进度 */
.file-progress { display: inline-flex; align-items: center; gap: 8px; min-width: 140px; }
.progress-track { flex: 1; height: 6px; overflow: hidden; background: rgba(0, 255, 255, 0.15); border-radius: 3px; }
.progress-fill { height: 100%; width: 0; background: #00ffff; transition: width 0.2s ease; }
.fill-success { background: #00ffff; }
.fill-failed { background: #ff69b4; }
.fill-cancelled { background: #888; }
.progress-text { color: #cceeff; font-size: 0.85rem; }
.result-actions { display: flex; gap: 10px; flex-wrap: wrap; }

/* ==== 窄屏适配 ====
   窄屏收紧内边距，按钮铺满宽度并保证触摸尺寸；
   上传进度与结果里的文件名、URL 允许换行，避免溢出容器。
*/
@media (max-width: 768px) {
  .admin-section {
    margin: 30px 0;
    padding: 18px 14px;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .quick-actions button,
  .crt-file-label .crt-mini-btn {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .upload-status {
    font-size: 0.95rem;
    word-break: break-word;
  }

  .upload-results ul {
    padding-left: 18px;
  }

  .upload-results li {
    word-break: break-all;
    line-height: 1.6;
  }
}

@media (max-width: 480px) {
  .admin-section {
    padding: 14px 10px;
  }
}
</style>
