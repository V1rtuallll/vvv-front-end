<template>
  <article class="blog-detail">
    <!-- 发布后落地的就是这一页，没有它读者只能靠浏览器后退键回列表 -->
    <router-link to="/blog" class="crt-mini-btn blog-detail-back">← Blogs</router-link>

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
          <button class="crt-mini-btn danger" @click="requestDeletePost">删除</button>
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
        @delete-comment="requestDeleteComment"
      />
    </template>

    <p v-else class="blog-missing">文章不可见或不存在</p>

    <!-- 删除文章与删除评论共用同一个弹窗，靠 deleteTarget 区分删的是什么（与画廊同一形状） -->
    <ConfirmDialog
      :visible="!!deleteTarget"
      :title="deleteTarget?.kind === 'comment' ? '删除评论' : '删除文章'"
      :message="deleteTarget ? `确定删除 ${deleteTarget.label}？该操作不可撤销。` : ''"
      :confirming="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </article>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import ConfirmDialog from "@/components/ConfirmDialog.vue";
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

// 确认框由页面持有，composable 只负责删除本身 —— 与 gallery 的删除流程同一口径。
// deleteTarget 同时描述删的是什么：文章带书名号，评论带 @用户名。
const deleteTarget = ref(null);
const deleting = ref(false);

const requestDeletePost = () => {
  deleteTarget.value = { kind: "post", label: `《${blog.value?.title ?? ""}》` };
};

const requestDeleteComment = (comment) => {
  deleteTarget.value = { kind: "comment", comment, label: `@${comment.username}` };
};

const cancelDelete = () => {
  deleteTarget.value = null;
};

const confirmDelete = async () => {
  const target = deleteTarget.value;
  if (!target) return;

  deleting.value = true;
  try {
    if (target.kind === "comment") {
      await removeComment(target.comment);
    } else if (await remove()) {
      router.push("/blog");
    }
  } finally {
    deleting.value = false;
    deleteTarget.value = null;
  }
};
</script>

<style src="./index.css" scoped></style>
