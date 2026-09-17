<template>
  <article class="blog-card">
    <img v-if="blog.coverImage" :src="blog.coverImage" alt="" class="blog-card-cover" />

    <div class="blog-card-body">
      <h3 class="blog-card-title">{{ blog.title }}</h3>
      <p class="blog-card-summary">{{ blog.summary || "暂无摘要" }}</p>

      <div class="blog-card-meta">
        <span class="blog-card-author">@{{ blog.authorUsername || "神秘人" }}</span>
        <span class="blog-card-time">{{ formatShortDate(blog.createdAt) }}</span>
        <span class="blog-card-stats">👁 {{ blog.views || 0 }} · 💬 {{ blog.commentCount || 0 }}</span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { formatShortDate } from "@/utils/DateUtil";

// 纯展示：数据由列表页传进来，卡片自己不请求、不判断身份。
// 形状就是后端的 BlogSummaryVO（不含正文）。
defineProps({
  blog: { type: Object, required: true },
});
</script>

<style scoped>
.blog-card {
  overflow: hidden;
  background: rgba(5, 5, 20, 0.78);
  border: 1px solid rgba(0, 255, 255, 0.25);
  border-radius: 14px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.blog-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 105, 180, 0.6);
  box-shadow: 0 0 24px rgba(255, 105, 180, 0.35);
}

.blog-card-cover {
  display: block;
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
}

.blog-card-body {
  padding: 18px 20px 20px;
}

.blog-card-title {
  margin: 0 0 10px;
  color: #00ffff;
  font-family: "Orbitron", "Rajdhani", monospace;
  font-size: 1.2rem;
  word-break: break-word;
}

.blog-card-summary {
  margin: 0 0 14px;
  color: #c9c9dd;
  font-family: "Rajdhani", "Courier New", monospace;
  font-size: 0.95rem;
  line-height: 1.8;
  word-break: break-word;
}

.blog-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #8a8aa0;
  font-family: "Rajdhani", "Courier New", monospace;
  font-size: 0.85rem;
}

.blog-card-author {
  color: #ffaae6;
}

@media (max-width: 768px) {
  .blog-card-cover {
    height: 150px;
  }
}
</style>
