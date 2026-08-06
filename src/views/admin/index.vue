<template>
  <div class="crt-admin-wrapper">
    <div class="crt-screen">
      <div class="crt-scanlines"></div>
      <main class="crt-content">
        <h2 class="crt-title">✦ 最高指挥中心 ✦</h2>
        <p class="admin-welcome">欢迎回来，最特别的V1rtual～❤️</p>

        <AdminQuickActions
          :syncing="syncing"
          :uploading="uploading"
          :upload-total="uploadTotal"
          :upload-completed="uploadCompleted"
          :uploaded-files="uploadedFiles"
          @sync="syncOssToDb"
          @upload="handleFileUpload"
          @clear-results="clearUploadResults"
        />

        <HomeConfigForm
          :config="homeConfig"
          :available-files="availableFiles"
          @save="saveHomeConfig"
          @set-main="setAsMain"
        />

        <ResourceBrowser
          :filter="resourceFilter"
          :resources="resourceList"
          :total="resourceTotal"
          :page="resourcePage"
          :total-pages="totalPages"
          :size="pageSize"
          :format-date="formatDate"
          @update:size="pageSize = $event"
          @change-filter="fetchResources(1)"
          @change-page="fetchResources"
          @change-size="onPageSizeChange"
          @copy="copyToClipboard"
          @edit="openEditModal"
        />

        <button @click="backToProfile" class="crt-btn back-btn">返回个人中心</button>
        <ResourceEditorDialog :item="editingItem" @save="saveEdit" @cancel="editingItem = null" />
      </main>
    </div>
  </div>
</template>

<script setup>
import AdminQuickActions from "./components/AdminQuickActions.vue";
import HomeConfigForm from "./components/HomeConfigForm.vue";
import ResourceBrowser from "./components/ResourceBrowser.vue";
import ResourceEditorDialog from "./components/ResourceEditorDialog.vue";
import { useAdminPage } from "@/modules/admin/composables/useAdminPage";

const {
  syncing,
  uploading,
  uploadedFiles,
  uploadTotal,
  uploadCompleted,
  homeConfig,
  availableFiles,
  saveHomeConfig,
  setAsMain,
  syncOssToDb,
  handleFileUpload,
  clearUploadResults,
  backToProfile,
  resourceFilter,
  resourceList,
  resourceTotal,
  resourcePage,
  totalPages,
  fetchResources,
  formatDate,
  editingItem,
  openEditModal,
  saveEdit,
  copyToClipboard,
  pageSize,
  onPageSizeChange,
} = useAdminPage();
</script>

<style scoped>
.back-btn {
  margin: 40px auto 0;
  display: block;
}
</style>
