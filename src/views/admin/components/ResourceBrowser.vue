<template>
  <section class="admin-section resource-browser">
    <h3 class="section-title">媒体资源浏览器 ✨（共 {{ total }} 条）</h3>

    <div class="filter-bar">
      <label>类型：</label>
      <select v-model="filter.type" @change="$emit('change-filter')" class="crt-input small">
        <option value="">全部</option>
        <option value="photo">图片</option>
        <option value="gif">动图</option>
        <option value="video">视频</option>
        <option value="music">音乐</option>
      </select>

      <div class="top-controls">
        <div class="pagination top">
          <button @click="$emit('change-page', page - 1)" :disabled="page <= 1" class="crt-mini-btn">上一页</button>
          <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
          <button @click="$emit('change-page', page + 1)" :disabled="page >= totalPages" class="crt-mini-btn">下一页</button>
        </div>

        <div class="page-size-selector">
          <label>每页显示：</label>
          <select v-model="pageSize" @change="$emit('change-size')" class="crt-input small">
            <option value="3">3 条</option>
            <option value="5">5 条</option>
            <option value="10">10 条</option>
            <option value="20">20 条</option>
          </select>
        </div>
      </div>
    </div>

    <div class="resource-list-horizontal">
      <article v-for="item in resources" :key="item.id" class="resource-row">
        <div class="preview-col">
          <img v-if="item.type === 'photo' || item.type === 'gif'" :src="item.url" class="preview-img" />
          <video v-else-if="item.type === 'video'" :src="item.url" controls class="preview-media"></video>
          <audio v-else-if="item.type === 'music'" :src="item.url" controls class="preview-media"></audio>
        </div>

        <div class="info-col">
          <div class="header-info">
            <span class="type-tag" :class="item.type">{{ item.type.toUpperCase() }}</span>
            <span class="meta">ID: {{ item.id }}</span>
            <span class="meta">{{ formatDate(item.created_at) }}</span>
            <span class="meta">{{ item.uploader_username || "V1rtual" }}</span>
          </div>

          <div class="src-row">
            <input type="text" :value="item.url" readonly class="src-input" @click="$event.target.select()" />
            <button @click="$emit('copy', item.url)" class="crt-mini-btn copy-btn">复制 SRC</button>
          </div>

          <div class="details">
            <p><strong>标题：</strong>{{ item.filename || "未设置" }}</p>
            <p><strong>描述：</strong>{{ item.description || "无" }}</p>
            <p v-if="item.type === 'photo'"><strong>Alt：</strong>{{ item.alt || "无" }}</p>
            <p v-if="item.type === 'photo'"><strong>分类：</strong>{{ item.category || "无" }}</p>
            <p v-if="item.type === 'video' || item.type === 'music'"><strong>时长：</strong>{{ item.duration ? item.duration + "秒" : "未知" }}</p>
            <p><strong>标签：</strong>{{ item.tags || "无" }}</p>
          </div>
        </div>

        <div class="action-col">
          <button @click="$emit('edit', item)" class="crt-mini-btn edit-btn">修改信息</button>
        </div>
      </article>

      <div v-if="resources.length === 0" class="empty-tip">暂无资源</div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  filter: { type: Object, required: true },
  resources: { type: Array, default: () => [] },
  total: { type: Number, required: true },
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  size: { type: Number, required: true },
  formatDate: { type: Function, required: true },
});

const emit = defineEmits(["change-filter", "change-page", "change-size", "copy", "edit", "update:size"]);
const pageSize = computed({
  get: () => props.size,
  set: (value) => emit("update:size", Number(value)),
});

</script>

<style scoped>
.admin-section { margin: 50px 0; padding: 30px; background: rgba(5, 5, 20, 0.6); border: 1px solid #00ffff44; border-radius: 12px; }
.resource-browser { margin: 60px 0; }
.filter-bar { margin-bottom: 25px; display: flex; align-items: center; gap: 15px; }
.resource-list-horizontal { display: flex; flex-direction: column; gap: 20px; }
.resource-row { display: flex; align-items: stretch; background: rgba(0, 10, 25, 0.7); padding: 20px; border-radius: 10px; border: 1px solid #00ffff33; gap: 20px; flex-wrap: wrap; }
.preview-col { flex: 0 0 220px; display: flex; justify-content: center; align-items: center; }
.preview-img { max-height: 180px; max-width: 220px; border-radius: 8px; box-shadow: 0 0 15px #00ffff44; object-fit: contain; }
.preview-media { max-width: 220px; max-height: 120px; border-radius: 8px; }
.info-col { flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 12px; }
.header-info { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; color: #00ffff; font-size: 0.95rem; }
.header-info .meta, .details p { color: #00dddd; }
.src-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.src-input { flex: 1; min-width: 280px; padding: 10px; background: #000; border: 1px solid #00ffff88; color: #00ffff; border-radius: 6px; }
.copy-btn { background: linear-gradient(45deg, #ff69b4, #00ffff); color: #000; font-weight: bold; white-space: nowrap; }
.details p { margin: 5px 0; font-size: 0.95rem; }
.action-col { flex: 0 0 auto; display: flex; align-items: flex-start; padding-top: 40px; }
.edit-btn { padding: 10px 18px; white-space: nowrap; }
.empty-tip { text-align: center; padding: 60px; color: #00aaaa; font-style: italic; }
.top-controls { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin: 20px 0 30px; padding: 15px; background: rgba(0, 0, 20, 0.4); border-radius: 10px; border: 1px solid #00ffff33; }
.pagination.top { display: flex; align-items: center; gap: 20px; font-size: 1.1rem; color: #ff69b4; }
.page-info { min-width: 160px; text-align: center; font-style: italic; }
.page-size-selector { display: flex; align-items: center; gap: 10px; color: #00ffff; font-size: 1rem; }
</style>
