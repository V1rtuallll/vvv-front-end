<template>
  <section class="admin-section">
    <h3 class="section-title">Home 页面配置</h3>

    <div class="field-group">
      <label>类型</label>
      <select v-model="config.main.type" class="crt-input">
        <!-- 「全类型」= 在三张类型表里随机。画廊的图文全部落在 photo 表里，
             绑死单一类型时如果绑成 video 就永远取不到画廊条目 -->
        <option value="all">全类型（图片 / 动图 / 视频 随机）</option>
        <!-- 两边规则不同：图片/动图只取画廊里的（保证点得进详情），
             视频取全部（视频几乎不在画廊里，只取交集等于把视频整个排除） -->
        <option value="gallery">画廊图文 + 全部视频</option>
        <option value="image">图片</option>
        <option value="gif">动图</option>
        <option value="video">视频</option>
      </select>
    </div>

    <div class="field-group">
      <label>随机从数据库取</label>
      <input
        type="checkbox"
        :checked="config.main.random === 1"
        @change="config.main.random = $event.target.checked ? 1 : 0"
      />
    </div>

    <div v-if="config.main.random !== 1" class="field-group">
      <label>指定 URL</label>
      <input v-model="config.main.src" class="crt-input" placeholder="https://..." />
    </div>

    <div class="field-group">
      <label>标题</label>
      <input v-model="config.main.title" class="crt-input" />
    </div>

    <div class="field-group">
      <label>描述</label>
      <textarea v-model="config.main.desc" class="crt-textarea"></textarea>
    </div>

    <div class="field-group">
      <label>大展示 Alt（无障碍描述）</label>
      <input v-model="config.main.alt" class="crt-input" placeholder="月光洒落" />
    </div>

    <div v-if="config.main.random" class="field-group">
      <label>随机源（{{ availableFiles.length }} 条，点缩略图可先预览）</label>
      <ul class="file-list">
        <li v-for="(file, index) in availableFiles" :key="index" class="file-item">
          <div class="file-preview">
            <video
              v-if="kindOf(file) === 'video'"
              :src="file"
              preload="metadata"
              muted
              playsinline
              controls
              class="preview-media"
            ></video>
            <img
              v-else-if="kindOf(file) === 'image'"
              :src="file"
              loading="lazy"
              alt=""
              class="preview-img"
            />
            <audio
              v-else-if="kindOf(file) === 'audio'"
              :src="file"
              preload="none"
              controls
              class="preview-media"
            ></audio>
            <span v-else class="preview-none">无预览</span>
          </div>
          <div class="file-meta">
            <!-- 显示文件名而不是整条 URL，完整地址放在 title 与 href 里 -->
            <a :href="file" target="_blank" rel="noopener" class="file-link" :title="file">
              {{ shortName(file) }}
            </a>
            <button @click="$emit('set-main', file)" class="crt-mini-btn">设为主展示</button>
          </div>
        </li>
      </ul>
    </div>

    <button @click="$emit('save')" class="crt-btn">保存 Home 配置</button>
  </section>
</template>

<script setup>
defineProps({
  config: { type: Object, required: true },
  availableFiles: { type: Array, default: () => [] },
});

defineEmits(["save", "set-main"]);

// 列表里只有 URL，按扩展名判断该用哪种预览元素
const EXTENSION_KIND = {
  mp4: "video", webm: "video", avi: "video", mov: "video", mkv: "video",
  gif: "image", jpg: "image", jpeg: "image", png: "image", webp: "image", bmp: "image",
  mp3: "audio", wav: "audio", flac: "audio", aac: "audio", ogg: "audio",
};

const pathOf = (url) => String(url).split("?")[0];

const fileName = (url) => {
  const path = pathOf(url);
  return path.substring(path.lastIndexOf("/") + 1) || path;
};

const kindOf = (url) => {
  const name = fileName(url);
  const dot = name.lastIndexOf(".");
  return EXTENSION_KIND[dot > 0 ? name.substring(dot + 1).toLowerCase() : ""] ?? "unknown";
};

const shortName = fileName;
</script>

<style scoped>
.admin-section {
  margin: 50px 0;
  padding: 30px;
  background: #e9f2f9;
  border: 1px solid #b9c4cc;
  border-radius: 12px;
}

.preview-none {
  color: #7b8fa1;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .admin-section {
    margin: 30px 0;
    padding: 18px 14px;
  }
}
</style>
