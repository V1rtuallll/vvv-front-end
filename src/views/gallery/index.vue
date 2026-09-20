<template>
  <div class="gallery-wrapper">
    <header class="gallery-header">
      <div class="header-content">
        <h1 class="gallery-title">Gallery</h1>
        <p class="gallery-subtitle">Share ur memory.</p>
      </div>
      <div class="header-right">
        <div v-if="authStore.isLoggedIn" class="current-user">
          <img :src="authStore.user.avatar || '/default-avatar.gif'" alt="头像" class="user-avatar" />
          <span class="user-name">@{{ authStore.user.username }}</span>
          <button @click="openUploadModal" class="crt-btn upload-btn">Upload</button>
        </div>
      </div>
    </header>

    <!-- 上传 / 编辑 / 换文件的进度就显示在头像下面，不是浮层。
         全部跑完之后出现「关闭」，用户自己决定什么时候把它收掉。 -->
    <UploadQueuePanel
      :items="uploadItems"
      :overall-progress="uploadOverallProgress"
      :success-count="uploadSuccessCount"
      :failed-count="uploadFailedCount"
      :busy="uploadBusy"
      @cancel="cancelTask"
      @retry="retryUpload"
      @clear="clearTasks"
    />

    <main class="gallery-grid">
      <article v-for="item in galleryList" :key="item.id" class="gallery-card" @click="openDetailModal(item)">
        <!-- 顶部条：左标题、右编号。与首页拼图卡同一套版式。
             编号用后端下发的真实主键，不用列表序号 -->
        <div class="card-head">
          <span class="card-head-title">{{ item.title || "未命名" }}</span>
          <span class="card-head-id">ID #{{ String(item.id).padStart(3, "0") }}</span>
        </div>

        <div class="media-preview-wrapper">
          <img v-if="item.type === 'photo' || item.type === 'gif'" :src="item.src" class="media-preview" />
          <video v-else-if="item.type === 'video'" :src="item.src" loop muted class="media-preview"></video>
          <!-- 音乐项只是进入详情的入口，不在列表里播：一页 6 个 <audio controls>
               会一起加载解码，而真正的播放与暂停在详情弹窗里 -->
          <div v-else-if="item.type === 'music'" class="media-audio-placeholder"><span class="ui-icon ui-icon-music"></span></div>
        </div>

        <div class="card-body">
          <!-- 与首页卡片同构：左上传信息、右标题+描述。标题在顶部条已出现一次，
               这里再放大出现一次 —— 只放顶部那条小字，标题基本读不出来 -->
          <div class="card-info">
            <div class="card-meta" @click.stop="openUserProfile(item.userId || item.uploaderId, item.uploaderUsername)">
              <img :src="item.uploaderAvatar || item.uploader_avatar || '/default-avatar.gif'" alt="上传者头像" class="card-avatar" />
              <div class="meta-text"><span class="uploader">@{{ item.uploaderUsername || "神秘人" }}</span><span class="time">{{ formatShortDate(item.createdAt) }}</span></div>
            </div>
            <div class="card-text">
              <h3 class="card-title">{{ item.title || "未命名" }}</h3>
              <p class="card-desc">{{ item.description || "无描述" }}</p>
            </div>
          </div>
          <div class="interactions"><span class="like-count"><span class="ui-icon ui-icon-heart"></span> {{ item.likes }}</span><span class="comment-count"><span class="ui-icon ui-icon-comment"></span> {{ item.commentCount || 0 }}</span></div>
          <!-- 编辑与删除只在详情弹窗里提供，列表页不再放置入口 -->
        </div>

        <!-- 底部类型条 -->
        <div class="card-foot">{{ item.type.toUpperCase() }}</div>
      </article>

      <div v-if="galleryList.length === 0" class="empty-state">
        <p>There's empty...</p>
        <button @click="openUploadModal" class="crt-btn">立即上传</button>
      </div>
    </main>

    <nav v-if="total > 0" class="bottom-pagination">
      <select v-model="limit" @change="changeLimit" class="page-size-select">
        <option value="4">4 条</option><option value="6">6 条</option><option value="8">8 条</option><option value="10">10 条</option>
      </select>
      <button @click="changePage(page - 1)" :disabled="page <= 1" class="crt-mini-btn">上一页</button>
      <span class="page-info">第 {{ page }} / {{ totalPages }} 页（共 {{ total }} 条）</span>
      <button @click="changePage(page + 1)" :disabled="page >= totalPages" class="crt-mini-btn">下一页</button>
    </nav>

    <GalleryUploadDialog
      :visible="showUploadModal"
      :limit-text="uploadLimitText"
      @close="closeUploadModal"
      @publish="publishOne"
    />
    <GalleryDetailDialog
      :item="currentItem"
      :threads="commentThreads"
      :comment="newComment"
      :reply-to="replyTarget"
      :expanded-threads="expandedThreads"
      :format-date="formatDate"
      :format-short-date="formatShortDate"
      :can-manage="canManageItem"
      :can-manage-comment="canManageComment"
      @close="closeDetailAndClearQuery"
      @show-user="openUserProfile"
      @toggle-like="toggleLike"
      @resize-start="startResize"
      @update:comment="newComment = $event"
      @post-comment="postComment"
      @reply="startReply"
      @cancel-reply="cancelReply"
      @toggle-replies="toggleThread"
      @like-comment="likeComment"
      @edit="openEditModal"
      @delete="requestDeleteItem"
      @delete-comment="requestDeleteComment"
    />
    <GalleryUserProfileDialog
      :visible="showUserProfile"
      :user="selectedUser"
      :display-gender="displayGender"
      :format-date="formatDate"
      @close="showUserProfile = false"
    />
    <GalleryEditDialog
      :visible="!!editingItem"
      :item="editingItem"
      :replacement-file="replacementFile"
      @close="closeEditModal"
      @submit="submitEdit"
      @select-replacement="setReplacementFile"
    />
    <ConfirmDialog
      :visible="!!deleteTarget"
      :title="deleteTarget?.type === 'comment' ? '删除评论' : '删除资源'"
      :message="deleteTarget ? `确定删除 ${deleteTarget.label}？该操作不可撤销。` : ''"
      :confirming="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup>
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import GalleryDetailDialog from "./components/GalleryDetailDialog.vue";
import GalleryEditDialog from "./components/GalleryEditDialog.vue";
import GalleryUploadDialog from "./components/GalleryUploadDialog.vue";
import GalleryUserProfileDialog from "./components/GalleryUserProfileDialog.vue";
import UploadQueuePanel from "@/components/UploadQueuePanel.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import { useGalleryPage } from "@/modules/gallery/composables/useGalleryPage";

const {
  authStore,
  page,
  limit,
  total,
  totalPages,
  galleryList,
  showUploadModal,
  uploadItems,
  uploadLimitText,
  uploadOverallProgress,
  uploadSuccessCount,
  uploadFailedCount,
  uploadBusy,
  retryUpload,
  cancelTask,
  clearTasks,
  currentItem,
  newComment,
  replyTarget,
  startReply,
  cancelReply,
  commentThreads,
  expandedThreads,
  toggleThread,
  showUserProfile,
  selectedUser,
  likeComment,
  openUserProfile,
  closeDetail,
  changePage,
  changeLimit,
  openUploadModal,
  closeUploadModal,
  publishOne,
  toggleLike,
  openDetailModal,
  postComment,
  displayGender,
  startResize,
  formatDate,
  formatShortDate,
  canManageItem,
  canManageComment,
  editingItem,
  replacementFile,
  setReplacementFile,
  openEditModal,
  closeEditModal,
  submitEdit,
  deleteTarget,
  deleting,
  requestDeleteItem,
  requestDeleteComment,
  cancelDelete,
  confirmDelete,
} = useGalleryPage();

const route = useRoute();
const router = useRouter();

/**
 * 深链：/gallery?id=N 或 /gallery?src=... 时自动弹出对应项的详情。
 *
 * 两种定位方式的原因：侧栏的列表条目有主键，用 id；而首页主展示走的是
 * /home/random，那个接口不下发 id（只回 src/标题/描述/上传者），只能用 src 定位。
 *
 * 不需要「按 id 查单条」的接口：目标必须已经在当前页的 galleryList 里。
 * 找不到就静默不开 —— 主展示的资源可能不落在第一页，这不是错误。
 */
const openDetailFromQuery = () => {
  const wantedId = route.query.id;
  const wantedSrc = route.query.src;
  const hasId = wantedId != null && wantedId !== "";
  if (!hasId && !wantedSrc) return;

  const item = hasId
    ? galleryList.value.find((row) => String(row.id) === String(wantedId))
    : galleryList.value.find((row) => row.src === wantedSrc);
  if (item) openDetailModal(item);
};

// 首屏要等列表加载完才找得到目标，所以盯着 galleryList 而不是挂在 onMounted 上
watch(galleryList, openDetailFromQuery, { immediate: true });

// 已经在 /gallery 时再点侧栏另一条：路由没变、组件不重挂载，只有 query 变
watch(() => [route.query.id, route.query.src], openDetailFromQuery);

/**
 * 关掉详情要把 id 从地址里撤掉。不撤的话再点侧栏同一条，query 没变，
 * 上面那个 watch 不触发，弹窗不会重新打开。
 */
const closeDetailAndClearQuery = () => {
  closeDetail();
  if (route.query.id == null && route.query.src == null) return;
  const rest = { ...route.query };
  delete rest.id;
  delete rest.src;
  router.replace({ path: route.path, query: rest });
};
</script>

<style src="./index.css" scoped></style>
