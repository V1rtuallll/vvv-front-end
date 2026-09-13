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

    <main class="gallery-grid">
      <article v-for="item in galleryList" :key="item.id" class="gallery-card" @click="openDetailModal(item)">
        <div class="media-preview-wrapper">
          <img v-if="item.type === 'photo' || item.type === 'gif'" :src="item.src" class="media-preview" />
          <video v-else-if="item.type === 'video'" :src="item.src" loop muted class="media-preview"></video>
          <audio v-else-if="item.type === 'music'" :src="item.src" controls class="media-audio-preview"></audio>
          <div class="type-badge" :class="item.type">{{ item.type.toUpperCase() }}</div>
        </div>

        <div class="card-body">
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-desc">{{ item.description || "无描述" }}</p>
          <div class="card-meta" @click.stop="openUserProfile(item.userId || item.uploaderId, item.uploaderUsername)">
            <img :src="item.uploaderAvatar || item.uploader_avatar || '/default-avatar.gif'" alt="上传者头像" class="card-avatar" />
            <div class="meta-text"><span class="uploader">@{{ item.uploaderUsername || "神秘人" }}</span><span class="time">{{ formatShortDate(item.createdAt) }}</span></div>
          </div>
          <div class="interactions"><span class="like-count">❤️ {{ item.likes }}</span><span class="comment-count">💬 {{ item.commentCount || 0 }}</span></div>
          <!-- 入口只在作者本人或管理员可见。隐藏只是显示逻辑，越权请求由接口拒绝 -->
          <div v-if="canManageItem(item)" class="card-actions" @click.stop>
            <button class="crt-mini-btn" @click="openEditModal(item)">编辑</button>
            <button class="crt-mini-btn" @click="requestDeleteItem(item)">删除</button>
          </div>
        </div>
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
      :files="pendingFiles"
      :uploading="uploading"
      @close="closeUploadModal"
      @select-files="handleFiles"
      @upload="uploadAll"
    />
    <GalleryDetailDialog
      :item="currentItem"
      :comments="comments"
      :comment="newComment"
      :format-date="formatDate"
      :format-short-date="formatShortDate"
      :can-manage="canManageItem"
      :can-manage-comment="canManageComment"
      @close="closeDetail"
      @show-user="openUserProfile"
      @toggle-like="toggleLike"
      @resize-start="startResize"
      @update:comment="newComment = $event"
      @post-comment="postComment"
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
      :saving="savingEdit"
      @close="closeEditModal"
      @submit="submitEdit"
    />
    <GalleryConfirmDialog
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
import GalleryConfirmDialog from "./components/GalleryConfirmDialog.vue";
import GalleryDetailDialog from "./components/GalleryDetailDialog.vue";
import GalleryEditDialog from "./components/GalleryEditDialog.vue";
import GalleryUploadDialog from "./components/GalleryUploadDialog.vue";
import GalleryUserProfileDialog from "./components/GalleryUserProfileDialog.vue";
import { useGalleryPage } from "@/modules/gallery/composables/useGalleryPage";

const {
  authStore,
  page,
  limit,
  total,
  totalPages,
  galleryList,
  showUploadModal,
  pendingFiles,
  uploading,
  currentItem,
  comments,
  newComment,
  showUserProfile,
  selectedUser,
  likeComment,
  openUserProfile,
  closeDetail,
  changePage,
  changeLimit,
  openUploadModal,
  closeUploadModal,
  handleFiles,
  uploadAll,
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
  savingEdit,
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
</script>

<style src="./index.css" scoped></style>
