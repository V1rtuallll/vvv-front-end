<template>
  <article class="blog-card" :class="{ 'no-cover': !blog.coverImage }">
    <!-- 顶部条：左标题、右编号。与首页拼图卡同一套版式 -->
    <div class="blog-card-head">
      <span class="blog-card-head-title">{{ blog.title }}</span>
      <span class="blog-card-head-id">ID #{{ String(blog.id).padStart(3, "0") }}</span>
    </div>

    <img v-if="blog.coverImage" :src="blog.coverImage" alt="" class="blog-card-cover" />

    <div class="blog-card-body">
      <!-- 标准式：标题 → 描述 → meta 贴底。
           标题同时出现在顶部条（小字索引）和这里（正题），和首页卡片一样是「两遍」 -->
      <h3 class="blog-card-title">{{ blog.title }}</h3>
      <p class="blog-card-summary">{{ blog.summary || "暂无摘要" }}</p>

      <!-- margin-top: auto 把这一行推到卡体最底，中间的空隙留给标题与描述 -->
      <div class="blog-card-meta">
        <span class="blog-card-author">@{{ blog.authorUsername || "神秘人" }}</span>
        <span class="blog-card-time">{{ formatShortDate(blog.createdAt) }}</span>
        <span class="blog-card-stats"><span class="ui-icon ui-icon-eye"></span> {{ blog.views || 0 }} · <span class="ui-icon ui-icon-comment"></span> {{ blog.commentCount || 0 }}</span>
      </div>
    </div>

    <!-- 底部条：文章没有「类型」，这里放发布日期，与拼图卡的底部类型条同构 -->
    <div class="blog-card-foot">{{ formatShortDate(blog.createdAt) }}</div>
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
  /* 横排：顶栏与底栏通栏，中间封面在左、正文在右 */
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-areas:
    "head head"
    "cover body"
    "foot foot";
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #b9c4cc;
  transition: border-color 0.25s ease;
}

.blog-card:hover {
  border-color: #0277bd;
}

.blog-card-head {
  grid-area: head;
}

/* 封面框按 4:3 定高，不再跟着原图走。文章封面多为正方形，
   若让图片按自身高度参与行高计算，整行会被撑到图片高度（260px 列宽下就是 260px），
   正文列只有两行摘要时就空出一大块。改成固定框后整行由正文撑，图片裁切填满左边那格 */
.blog-card-cover {
  grid-area: cover;
  display: block;
  width: 100%;
  height: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-right: 1px solid #b9c4cc;
}

/* 没有封面时正文独占两列，不留一块空白 */
.blog-card.no-cover .blog-card-body {
  grid-column: 1 / -1;
}

.blog-card-body {
  grid-area: body;
  display: flex;
  flex-direction: column;
  padding: 18px 20px 20px;
}

/* 正文里的正题。顶部条那条小字只是索引，真正读的是这一条 */
.blog-card-title {
  margin: 0 0 10px;
  color: #000000;
  font-size: 1.35rem;
  line-height: 1.3;
  word-break: break-word;
}

/* 贴底 + 靠右：margin-top: auto 把它推到卡体最下沿，
   justify-content 再把它推到右下角，和顶部条右侧的编号徽章同一侧 */
.blog-card-meta {
  margin-top: auto;
  justify-content: flex-end;
}

.blog-card-foot {
  grid-area: foot;
}

/* 顶部条：左标题、右编号，与首页拼图卡同一套 */
.blog-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 10px;
  border-bottom: 1px solid #b9c4cc;
}

.blog-card-head-title {
  font-family: "Michroma", "Eurostile", sans-serif;
  /* 从 0.66 提到 0.8：0.66 在白底上几乎读不出来 */
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #000000;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blog-card-head-id {
  flex: none;
  padding: 2px 8px;
  border-radius: 3px;
  background: #8b8bb0;
  color: #ffffff;
  font-family: "Michroma", "Eurostile", sans-serif;
  font-size: 0.58rem;
  letter-spacing: 0.1em;
}

/* 底部标签条 */
.blog-card-foot {
  padding: 6px 10px;
  background: #b9c6d4;
  border-top: 1px solid #9aa9b8;
  text-align: center;
  font-family: "Michroma", "Eurostile", sans-serif;
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  color: #ffffff;
  text-shadow: 0 1px 0 rgba(60, 80, 100, 0.55);
}

.blog-card-summary {
  margin: 0 0 14px;
  color: #000000;
  font-family: "Rajdhani", "Courier New", monospace;
  font-size: 0.95rem;
  line-height: 1.8;
  word-break: break-word;
}

.blog-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #000000;
  font-family: "Rajdhani", "Courier New", monospace;
  font-size: 0.85rem;
}

.blog-card-author {
  color: #c2185b;
}

@media (max-width: 768px) {
  /* 横向两列在窄屏放不下（260px 封面 + 正文会溢出卡片）。
     改成单列纵向：顶栏 / 封面 / 正文 / 底栏 */
  .blog-card {
    grid-template-columns: 1fr;
    grid-template-areas:
      "head"
      "cover"
      "body"
      "foot";
  }

  .blog-card-cover {
    height: 180px;
    /* 单列时封面自占一行，用固定高度，不套 4:3 的框 */
    aspect-ratio: auto;
    border-right: none;
    border-bottom: 1px solid #b9c4cc;
  }

  /* 单列后正文自然在底部，margin-top: auto 会把标题推到底栏上方 */
  .blog-card-title {
    font-size: 1.15rem;
  }
}
</style>
