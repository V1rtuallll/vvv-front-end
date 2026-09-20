<template>
  <section class="blog-comments">
    <h2 class="comments-title">评论（{{ totalComments }}）</h2>

    <div v-if="canPost" class="comment-composer">
      <!-- 进入回复态时先亮出回复对象，用户可以随时取消 -->
      <div v-if="replyTo" class="reply-banner">
        <span>回复 @{{ replyTo.username }}</span>
        <button class="reply-cancel" @click="$emit('cancel-reply')">取消</button>
      </div>
      <div class="comment-input">
        <textarea
          :value="comment"
          placeholder="说点什么"
          rows="3"
          @input="$emit('update:comment', $event.target.value)"
        ></textarea>
        <button class="crt-mini-btn send-btn" :disabled="posting || !comment.trim()" @click="$emit('post-comment')">
          {{ posting ? "发送中" : "发送" }}
        </button>
      </div>
    </div>
    <p v-else class="comment-signin-hint">登录后可评论</p>

    <div class="comment-list">
      <article
        v-for="entry in displayComments"
        :key="entry.id"
        class="comment-item"
        :class="{ 'comment-reply-item': entry.isReply }"
      >
        <div class="comment-header">
          <span class="comment-author">
            <strong>@{{ entry.username }}</strong>
            <span v-if="entry.isReply" class="comment-reply-to">回复 @{{ entry.replyToName }}</span>
          </span>
          <span class="comment-time">{{ formatShortDate(entry.createdAt) }}</span>
        </div>
        <p class="comment-content">{{ entry.content }}</p>
        <div class="comment-footer">
          <div class="comment-actions">
            <button class="comment-reply-btn" @click="$emit('reply', entry)">回复</button>
            <!-- 回复默认折叠：评论一多，一屏全被回复占满就看不到别的了 -->
            <button
              v-if="entry.replies?.length"
              class="comment-replies-toggle"
              @click="$emit('toggle-replies', entry.id)"
            >{{ isExpanded(entry.id) ? "收起回复" : `展开回复 (${entry.replies.length})` }}</button>
          </div>
          <button
            class="comment-like-count"
            :class="{ 'is-liked': entry.isLiked }"
            @click="$emit('like-comment', entry)"
          ><span class="ui-icon ui-icon-heart"></span> {{ entry.likes || 0 }}</button>
          <button
            v-if="canManageComment(entry)"
            class="comment-delete-btn"
            @click="$emit('delete-comment', entry)"
          >删除</button>
        </div>
      </article>
      <p v-if="displayComments.length === 0" class="no-comment">暂无评论</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

// canManageComment 由页面注入：删除入口只在评论作者、文章作者或 owner 处显示，
// 组件自身不判断身份，保持纯展示（与 GalleryDetailDialog 同一手法）。
const props = defineProps({
  /** 已按父子关系排好的评论：顶层评论各自带 replies，层级不在组件里算 */
  threads: { type: Array, default: () => [] },
  comment: { type: String, default: "" },
  /** 正在回复的评论；为空表示发的顶层评论 */
  replyTo: { type: Object, default: null },
  /** 展开了回复的根评论 id 集合；展开状态由页面持有 */
  expandedThreads: { type: Object, default: () => new Set() },
  posting: Boolean,
  /** 未登录时不渲染输入框（接口也要求登录，藏起来免得点了必然失败） */
  canPost: { type: Boolean, default: true },
  formatShortDate: { type: Function, required: true },
  canManageComment: { type: Function, default: () => () => false },
});

defineEmits([
  "update:comment",
  "post-comment",
  "reply",
  "cancel-reply",
  "toggle-replies",
  "like-comment",
  "delete-comment",
]);

const isExpanded = (threadId) => props.expandedThreads.has(String(threadId));

/**
 * 顶层评论与它的回复铺平成一串：回复紧跟在自己的根评论后面，
 * 只有展开的线程才会带上回复。这样只有一套评论模板，不必把整块标记复制两遍。
 */
const displayComments = computed(() =>
  props.threads.flatMap((thread) => [
    { ...thread, isReply: false },
    ...(isExpanded(thread.id)
      ? (thread.replies || []).map((reply) => ({ ...reply, isReply: true }))
      : []),
  ]));

/** 标题里的评论数含折叠中的回复 */
const totalComments = computed(() =>
  props.threads.reduce((sum, thread) => sum + 1 + (thread.replies?.length ?? 0), 0));
</script>

<style scoped>
.blog-comments {
  margin: 40px 0 60px;
  padding-top: 26px;
  border-top: 1px solid rgba(0, 255, 255, 0.25);
}

.comments-title {
  margin: 0 0 18px;
  color: #000000;
  font-family: "Orbitron", "Rajdhani", monospace;
  font-size: 1.25rem;
}

.comment-composer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.comment-input {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.comment-input textarea {
  flex: 1;
  padding: 14px;
  color: #000000;
  font-family: "Rajdhani", "Courier New", monospace;
  background: #e9f2f9;
  border: 1px solid rgba(0, 255, 255, 0.5);
  border-radius: 12px;
  resize: vertical;
}

.reply-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  color: #c2185b;
  font-family: "Rajdhani", "Courier New", monospace;
  font-size: 0.95rem;
  background: rgba(255, 105, 180, 0.12);
  border-left: 3px solid #ff69b4;
  border-radius: 8px;
}

.reply-cancel {
  min-height: 32px;
  padding: 4px 14px;
  color: #ff69b4;
  font-size: 0.85rem;
  background: transparent;
  border: 1px solid #ff69b4;
  border-radius: 20px;
  cursor: pointer;
}

.comment-signin-hint {
  margin: 0 0 24px;
  color: #000000;
  font-family: "Rajdhani", "Courier New", monospace;
}

.comment-item {
  padding: 18px;
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
}

/* 回复缩进一格，并用一条竖线连回所属的根评论 */
.comment-reply-item {
  margin-left: 28px;
  border-left: 2px solid rgba(255, 105, 180, 0.45);
  border-radius: 0 15px 15px 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #ff69b4;
  font-family: "Rajdhani", "Courier New", monospace;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 10px;
}

.comment-reply-to {
  color: #c2185b;
  font-size: 0.85rem;
  font-weight: normal;
}

.comment-content {
  margin: 0;
  color: #000000;
  font-family: "Rajdhani", "Courier New", monospace;
  line-height: 1.7;
  word-break: break-word;
}

.comment-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 12px;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: auto;
}

.comment-reply-btn,
.comment-replies-toggle,
.comment-delete-btn {
  min-height: 32px;
  padding: 4px 14px;
  font-size: 0.9rem;
  border-radius: 20px;
  cursor: pointer;
}

.comment-reply-btn {
  color: #000000;
  background: rgba(0, 255, 255, 0.12);
  border: 1px solid #0277bd;
}

.comment-replies-toggle {
  color: #c2185b;
  background: rgba(255, 105, 180, 0.12);
  border: 1px solid #ff69b4;
}

.comment-like-count {
  padding: 0;
  color: #ff69b4;
  font-size: 0.95rem;
  background: none;
  border: none;
  cursor: pointer;
}

.comment-like-count.is-liked {
  color: #c2185b;
  cursor: default;
}

.comment-delete-btn {
  color: #ff69b4;
  background: rgba(255, 105, 180, 0.2);
  border: 1px solid #ff69b4;
}

.no-comment {
  padding: 40px 20px;
  color: #000000;
  font-family: "Rajdhani", "Courier New", monospace;
  text-align: center;
}

@media (max-width: 768px) {
  .comment-input {
    flex-direction: column;
    align-items: stretch;
  }

  .send-btn {
    min-height: 44px;
  }

  .comment-reply-item {
    margin-left: 14px;
  }

  .comment-reply-btn,
  .comment-replies-toggle,
  .comment-delete-btn {
    min-height: 44px;
  }
}
</style>
