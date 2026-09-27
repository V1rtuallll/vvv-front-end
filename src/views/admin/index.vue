<template>
  <div class="crt-admin-wrapper">
    <div class="crt-screen">
      <div class="crt-scanlines"></div>
      <main class="crt-content">
        <h2 class="crt-title">✦ 最高指挥中心 ✦</h2>
        <p class="admin-welcome">欢迎回来，V1rtual</p>
        <!-- 页面右上角原来也挂着这一条，已从那里撤下，只在这里显示 -->
        <p class="admin-user-count">人类数量：{{ userCount }}</p>

        <!-- 上传进度显示在标题下面，不是浮层；跑完后出现「关闭」 -->
        <UploadQueuePanel
          :items="uploadItems"
          :overall-progress="uploadOverallProgress"
          :success-count="uploadSuccessCount"
          :failed-count="uploadFailedCount"
          :busy="uploadBusy"
          @cancel="cancelTask"
          @retry="retryUpload"
          @clear="clearUploadResults"
        />

        <AdminQuickActions
          :syncing="syncing"
          :uploading="uploading"
          :upload-items="uploadItems"
          @sync="syncOssToDb"
          @select-files="selectUploadFiles"
          @upload="startUploads"
          @clear-results="clearUploadResults"
        />

        <HomeConfigForm
          :config="homeConfig"
          :available-files="availableFiles"
          @save="saveHomeConfig"
          @set-main="setAsMain"
        />

        <AboutConfigForm />

        <PlayerConfigForm />

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
import AboutConfigForm from "./components/AboutConfigForm.vue";
import PlayerConfigForm from "./components/PlayerConfigForm.vue";
import ResourceBrowser from "./components/ResourceBrowser.vue";
import ResourceEditorDialog from "./components/ResourceEditorDialog.vue";
import UploadQueuePanel from "@/components/UploadQueuePanel.vue";
import { useAdminPage } from "@/modules/admin/composables/useAdminPage";

const {
  syncing,
  uploading,
  uploadItems,
  uploadBusy,
  uploadOverallProgress,
  uploadSuccessCount,
  uploadFailedCount,
  retryUpload,
  cancelTask,
  homeConfig,
  availableFiles,
  saveHomeConfig,
  setAsMain,
  syncOssToDb,
  selectUploadFiles,
  startUploads,
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
  userCount,
} = useAdminPage();
</script>

<style scoped>
/* 欢迎语下面的一行状态信息。只调字号与透明度，不写颜色 ——
   这一块底色的深浅由外层主题决定，写死一个颜色换个主题就可能看不清 */
.admin-user-count {
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.85;
}

.back-btn {
  margin: 40px auto 0;
  display: block;
}

/* ==== 窄屏适配 ====
   <=768px：标题与欢迎语允许换行，返回按钮铺满宽度并保证触摸尺寸。
   页面各区块的窄屏规则分别写在对应子组件内。
*/
@media (max-width: 768px) {
  .crt-admin-wrapper,
  .crt-screen {
    width: 100%;
    max-width: 100%;
  }

  .crt-title {
    font-size: 1.5rem;
    word-break: break-word;
  }

  .admin-welcome {
    font-size: 1rem;
    word-break: break-word;
  }

  .admin-user-count {
    font-size: 0.9rem;
  }

  .back-btn {
    width: 100%;
    min-height: 44px;
    margin: 24px auto 0;
  }
}
</style>
