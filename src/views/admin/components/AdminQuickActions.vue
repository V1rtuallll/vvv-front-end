<template>
  <section class="admin-section quick-actions">
    <h3 class="section-title">快速资源管理</h3>
    <div class="action-buttons">
      <button @click="$emit('sync')" class="crt-btn sync-btn" :disabled="syncing">
        {{ syncing ? "同步中...✧" : "一键同步 OSS → 数据库" }}
      </button>

      <div class="upload-area">
        <label class="crt-file-label">
          <span>批量上传文件（自动识别类型，支持多选）</span>
          <input
            type="file"
            multiple
            accept="image/*,video/*,.gif,.mp3,.wav"
            class="hidden-file-input"
            :disabled="uploading"
            @change="$emit('upload', $event)"
          />
          <span class="crt-mini-btn upload-btn" :class="{ disabled: uploading }">
            {{ uploading ? "上传中..." : "选择文件（可多选）" }}
          </span>
        </label>

        <p v-if="uploading" class="upload-status">
          正在处理 {{ uploadTotal }} 个文件，已完成 {{ uploadCompleted }} / {{ uploadTotal }}...
        </p>

        <div v-if="uploadedFiles.length > 0" class="upload-results">
          <h4>本次上传结果</h4>
          <ul>
            <li v-for="(item, index) in uploadedFiles" :key="index">
              <span class="status-icon" :class="item.status">
                {{ item.status === "success" ? "✓" : item.status === "error" ? "✗" : "→" }}
              </span>
              <span class="file-name">{{ item.fileName }}</span>
              <a v-if="item.url" :href="item.url" target="_blank">{{ item.url }}</a>
              <span v-else-if="item.error" class="error-msg">{{ item.error }}</span>
            </li>
          </ul>
          <button @click="$emit('clear-results')" class="crt-mini-btn">清空结果</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  syncing: Boolean,
  uploading: Boolean,
  uploadTotal: Number,
  uploadCompleted: Number,
  uploadedFiles: { type: Array, default: () => [] },
});

defineEmits(["sync", "upload", "clear-results"]);
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
</style>
