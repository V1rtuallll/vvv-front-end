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
      @publish="publishBatch"
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
import { onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import GalleryDetailDialog from "./components/GalleryDetailDialog.vue";
import GalleryEditDialog from "./components/GalleryEditDialog.vue";
import GalleryUploadDialog from "./components/GalleryUploadDialog.vue";
import GalleryUserProfileDialog from "./components/GalleryUserProfileDialog.vue";
import UploadQueuePanel from "@/components/UploadQueuePanel.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import { getGalleryItem } from "@/modules/gallery/api/galleryApi";
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
  publishBatch,
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
 * 目标不在当前页时（默认一页只有 4 条）按 id / src 单独查一次，所以多远的深链都打得开。
 * 查不到的情况存在且合法：主展示的资源可能从没进过画廊，此时静默不开，只把地址里的 query 清掉。
 */

/** 已经处理过的深链标识；地址里的 query 清掉后复位，同一条链接之后还能再点开一次 */
let handledDeepLink = null;
/** 在途深链请求的序号：后来的请求让先前的响应作废 */
let deepLinkToken = 0;
let galleryUnmounted = false;

/** 当前地址里的深链目标；没有时返回 null */
const deepLinkOf = () => {
  const { id, src } = route.query;
  if (id != null && id !== "") return { key: `id:${id}`, params: { id } };
  if (src != null && src !== "") return { key: `src:${src}`, params: { src } };
  return null;
};

/** 详情里正在看的那一条的主键，统一转成字符串比较（后端 ID 是 Long，序列化后可能是数字或字符串） */
const viewingId = () => (currentItem.value?.id == null ? null : String(currentItem.value.id));

/** 把 id / src 从地址里撤掉，其余 query 原样保留 */
const clearDeepLinkQuery = () => {
  if (route.query.id == null && route.query.src == null) return;
  const rest = { ...route.query };
  delete rest.id;
  delete rest.src;
  router.replace({ path: route.path, query: rest });
};

const openDetailFromQuery = async () => {
  const link = deepLinkOf();
  if (!link) {
    // 地址里已经没有深链了，下一条链接（哪怕是同一个 id）重新开始处理
    handledDeepLink = null;
    return;
  }
  // 同一条链接只消费一次：列表重载会再触发本函数，不能在用户已经看过之后再弹一次
  if (link.key === handledDeepLink) return;
  handledDeepLink = link.key;

  // 快路径：目标就在当前页，不用发请求
  const local = link.params.id != null
    ? galleryList.value.find((row) => String(row.id) === String(link.params.id))
    : galleryList.value.find((row) => row.src === link.params.src);
  if (local) {
    clearDeepLinkQuery();
    openDetailModal(local);
    return;
  }

  // 不在当前页，按 id / src 单独查一次。这次响应回来时用户可能已经看过别的东西了，
  // 所以记下发起时的状态，回来再比一次
  const token = ++deepLinkToken;
  const viewingWhenStarted = viewingId();
  let row = null;
  try {
    row = (await getGalleryItem(link.params))?.data ?? null;
  } catch {
    // 后端回 404 表示目标不在画廊里，静默处理：提示由 request.js 负责，页面不再补一条
  }

  if (galleryUnmounted || token !== deepLinkToken) return;

  // 地址里的深链换成了另一条（或已经清掉）就什么都不做，免得把后进来的那条一起收掉
  if (deepLinkOf()?.key !== link.key) return;

  // 查不到、或者用户期间已经改看别的条目时不弹窗；但无论如何都要把地址里这条 query 收掉，
  // 否则之后每次列表重载都会再拿它弹一次
  const openable = row != null && viewingId() === viewingWhenStarted;
  clearDeepLinkQuery();
  if (openable) openDetailModal(row);
};

// query 在挂载前就已经在地址里（从侧栏点进来）时用 immediate 先消费掉；
// 列表随后落地的这次触发会被 handledDeepLink 拦下
watch(galleryList, openDetailFromQuery, { immediate: true });

// 已经在 /gallery 时再点侧栏另一条：路由没变、组件不重挂载，只有 query 变
watch(() => [route.query.id, route.query.src], openDetailFromQuery);

onBeforeUnmount(() => {
  galleryUnmounted = true;
});

/**
 * 关掉详情要把 id 从地址里撤掉。不撤的话再点侧栏同一条，query 没变，
 * 上面那个 watch 不触发，弹窗不会重新打开。
 */
const closeDetailAndClearQuery = () => {
  closeDetail();
  clearDeepLinkQuery();
};
</script>

<style src="./index.css" scoped></style>
