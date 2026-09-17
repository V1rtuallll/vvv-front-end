<template>
  <article class="blog-detail">
    <p v-if="loading" class="blog-loading">Loading...</p>

    <template v-else-if="blog">
      <header class="blog-detail-header">
        <h1 class="blog-detail-title">{{ blog.title }}</h1>
        <div class="blog-detail-meta">
          <span class="blog-detail-author">@{{ blog.authorUsername || "神秘人" }}</span>
          <span class="blog-detail-time">{{ formatDate(blog.createdAt) }}</span>
          <span class="blog-detail-views">👁 {{ blog.views || 0 }}</span>
          <span v-if="blog.status !== 1" class="blog-detail-draft">草稿</span>
        </div>
        <div v-if="canManage" class="blog-detail-actions">
          <router-link :to="`/blog/editor?id=${blog.id}`" class="crt-mini-btn">编辑</router-link>
          <button class="crt-mini-btn danger" @click="onDelete">删除</button>
        </div>
      </header>

      <SafeHtml class="blog-content" :html="blog.content" markdown />

      <BlogCommentSection
        :threads="threads"
        :comment="newComment"
        :reply-to="replyTarget"
        :expanded-threads="expandedThreads"
        :posting="posting"
        :can-post="authStore.isLoggedIn"
        :format-short-date="formatShortDate"
        :can-manage-comment="canManageComment"
        @update:comment="newComment = $event"
        @post-comment="postComment"
        @reply="startReply"
        @cancel-reply="cancelReply"
        @toggle-replies="toggleThread"
        @like-comment="likeComment"
        @delete-comment="removeComment"
      />
    </template>

    <p v-else class="blog-missing">文章不可见或不存在</p>
  </article>
</template>

<script setup>
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import SafeHtml from "@/components/SafeHtml.vue";
import { formatDate, formatShortDate } from "@/utils/DateUtil";
import { useBlogComments } from "@/modules/blog/composables/useBlogComments";
import { useBlogDetail } from "@/modules/blog/composables/useBlogDetail";
import BlogCommentSection from "@/views/blog/components/BlogCommentSection.vue";

// 正文样式不加 scoped，两条渲染路径（这里与编辑器预览）共用同一份
import "@/views/blog/blog-content.css";

const route = useRoute();
const router = useRouter();

const id = computed(() => route.params.id);
const { authStore, blog, loading, canManage, load, remove } = useBlogDetail(id);
// 文章作者也能删评论，所以把作者 id 交给评论区
const comments = useBlogComments(id, computed(() => blog.value?.authorId ?? null));
const {
  newComment,
  replyTarget,
  expandedThreads,
  posting,
  threads,
  canManageComment,
  loadComments,
  postComment,
  likeComment,
  removeComment,
  startReply,
  cancelReply,
  toggleThread,
} = comments;

const loadAll = async () => {
  await load();
  await loadComments();
};

onMounted(loadAll);
// 详情页之间互相跳转时组件会被复用，路由参数变了要重新加载
watch(id, loadAll);

const onDelete = async () => {
  if (await remove()) router.push("/blog");
};
</script>

<style src="./index.css" scoped></style>
