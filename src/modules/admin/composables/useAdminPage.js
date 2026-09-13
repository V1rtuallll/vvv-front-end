import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { getAdminHomeConfig, getAdminResources, saveAdminHomeConfig, syncOssResources, updateAdminResource, uploadAdminResource } from "@/modules/admin/api/adminApi";
import { isOwner } from "@/shared/auth/owner";
import { useAuthStore } from "@/stores/auth";
import { useUploadQueue } from "@/modules/upload/composables/useUploadQueue";

// 发请求的方法，catch 里只做状态回滚，不弹提示：
// 请求失败时 request.js 已经弹过后端返回的 msg，这里再弹一次会出现重复提示。
// 例外：逐文件上传的结果会显示在 uploadedFiles 列表里（AdminQuickActions.vue），
// 所以不需要额外的 toast 也能看到每个文件为什么失败。
export function useAdminPage() {
  const router = useRouter();
  const authStore = useAuthStore();
  const syncing = ref(false);
  // 与画廊上传共用同一套状态模型：每个文件一个请求、最多 3 个并发、可重试可取消。
  // 后端的管理上传接口只读 file，队列多带的 title/description/clientUploadId 会被忽略。
  const uploadQueue = useUploadQueue(uploadAdminResource, { maxConcurrent: 3 });
  const homeConfig = ref({ main: { type: "video", src: "", title: "", desc: "", random: false }, gallery: [], pinnedBlogId: null });
  const availableFiles = ref([]);
  const availableFilesByType = ref({});
  const resourceFilter = ref({ type: "" });
  const resourceList = ref([]);
  const resourceTotal = ref(0);
  const resourcePage = ref(1);
  const editingItem = ref(null);
  const pageSize = ref(5);
  const totalPages = computed(() => Math.ceil(resourceTotal.value / pageSize.value));

  const normalizeMainType = (type) => type === "photo" ? "image" : type;
  const refreshAvailableFiles = (type) => {
    const files = availableFilesByType.value[normalizeMainType(type)];
    if (files) availableFiles.value = files;
  };

  const loadHomeConfig = async () => {
    try {
      const res = await getAdminHomeConfig();
      availableFilesByType.value = res.data.availableFilesByType || {};
      homeConfig.value = res.data;
      availableFiles.value = res.data.availableFiles || [];
      refreshAvailableFiles(homeConfig.value.main.type);
      if (typeof homeConfig.value.main.random === "boolean") homeConfig.value.main.random = homeConfig.value.main.random ? 1 : 0;
    } catch {
      console.log("Home 配置加载失败，使用默认值");
    }
  };

  watch(() => homeConfig.value.main?.type, refreshAvailableFiles);

  const setAsMain = (file) => {
    homeConfig.value.main.src = file;
    homeConfig.value.main.random = 0;
  };

  const saveHomeConfig = async () => {
    try {
      const payload = { ...homeConfig.value, main: { ...homeConfig.value.main, random: homeConfig.value.main.random ? 1 : 0 } };
      await saveAdminHomeConfig(payload);
      window.$vmessage.success("Home 配置已保存");
      await loadHomeConfig();
    } catch {
      // 提示由 request.js 负责
    }
  };

  const syncOssToDb = async () => {
    if (syncing.value || !confirm("确定要全量同步所有 OSS 资源（video / gif / music / photo）到数据库吗？\n（会跳过已存在的记录）")) return;
    syncing.value = true;
    try {
      const res = await syncOssResources(["video", "gif", "music", "photo"]);
      const count = res.data?.insertedCount ?? 0;
      window.$vmessage.success(`同步完成，新增 ${count} 条记录`);
    } catch (err) {
      // 提示由 request.js 负责，这里只记录详情便于排查
      console.error("同步错误详情:", err.response?.data || err);
    } finally {
      syncing.value = false;
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    uploadQueue.reset();
    files.forEach((file) => uploadQueue.add(file));
    uploadQueue.start();
    event.target.value = "";
  };

  const clearUploadResults = () => { uploadQueue.reset(); };
  const backToProfile = () => router.push("/profile");

  const fetchResources = async (nextPage = 1) => {
    resourcePage.value = nextPage;
    try {
      const res = await getAdminResources({ page: resourcePage.value, limit: pageSize.value, type: resourceFilter.value.type || undefined });
      resourceList.value = res.data.list || [];
      resourceTotal.value = res.data.total || 0;
    } catch {
      // 提示由 request.js 负责
      resourceList.value = [];
      resourceTotal.value = 0;
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
  const openEditModal = (item) => { editingItem.value = { ...item }; };

  const saveEdit = async () => {
    if (!editingItem.value) return;
    try {
      const payload = (({ id, type, filename, description, alt, category, duration, tags }) => ({ id, type, filename, description, alt, category, duration, tags }))(editingItem.value);
      await updateAdminResource(payload);
      const index = resourceList.value.findIndex((item) => item.id === editingItem.value.id);
      if (index !== -1) resourceList.value[index] = { ...editingItem.value };
      window.$vmessage.success("资源信息已保存");
    } catch {
      // 提示由 request.js 负责
    } finally {
      editingItem.value = null;
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      window.$vmessage.success("SRC 已复制");
    } catch {
      // 剪贴板失败是本地错误，没有经过 request.js，需要自己提示
      window.$vmessage.error("复制失败");
    }
  };

  const onPageSizeChange = () => fetchResources(1);

  onMounted(async () => {
    if (!isOwner(authStore.user)) {
      router.push("/profile");
      window.$vmessage.error("没有权限访问后台");
      return;
    }
    await loadHomeConfig();
    await fetchResources(1);
  });

  return {
    syncing, homeConfig, availableFiles,
    saveHomeConfig, setAsMain, syncOssToDb, handleFileUpload, clearUploadResults, backToProfile,
    uploadItems: uploadQueue.items,
    uploading: uploadQueue.hasUnfinished,
    uploadOverallProgress: uploadQueue.overallProgress,
    uploadSuccessCount: uploadQueue.successCount,
    uploadFailedCount: uploadQueue.failedCount,
    retryUpload: uploadQueue.retry,
    retryAllFailedUploads: uploadQueue.retryAllFailed,
    resourceFilter, resourceList, resourceTotal, resourcePage, totalPages, fetchResources, formatDate,
    editingItem, openEditModal, saveEdit, copyToClipboard, pageSize, onPageSizeChange,
  };
}
