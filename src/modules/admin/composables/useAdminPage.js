import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { getAdminHomeConfig, getAdminResources, saveAdminHomeConfig, syncOssResources, updateAdminResource, uploadAdminResource } from "@/modules/admin/api/adminApi";
import { isOwner } from "@/shared/auth/owner";
import { useAuthStore } from "@/stores/auth";

export function useAdminPage() {
  const router = useRouter();
  const authStore = useAuthStore();
  const syncing = ref(false);
  const uploading = ref(false);
  const uploadedFiles = ref([]);
  const uploadTotal = ref(0);
  const uploadCompleted = ref(0);
  const homeConfig = ref({ main: { type: "video", src: "", title: "", desc: "", random: false }, gallery: [], pinnedBlogId: null });
  const availableFiles = ref([]);
  const resourceFilter = ref({ type: "" });
  const resourceList = ref([]);
  const resourceTotal = ref(0);
  const resourcePage = ref(1);
  const editingItem = ref(null);
  const pageSize = ref(5);
  const totalPages = computed(() => Math.ceil(resourceTotal.value / pageSize.value));

  const loadHomeConfig = async () => {
    try {
      const res = await getAdminHomeConfig();
      homeConfig.value = res.data;
      availableFiles.value = res.data.availableFiles || [];
      if (typeof homeConfig.value.main.random === "boolean") homeConfig.value.main.random = homeConfig.value.main.random ? 1 : 0;
    } catch {
      console.log("加载 Home 配置失败，使用默认");
    }
  };

  const setAsMain = (file) => {
    homeConfig.value.main.src = file;
    homeConfig.value.main.random = 0;
  };

  const saveHomeConfig = async () => {
    try {
      const payload = { ...homeConfig.value, main: { ...homeConfig.value.main, random: homeConfig.value.main.random ? 1 : 0 } };
      await saveAdminHomeConfig(payload);
      window.$vmessage.success("Home 配置保存成功～✞");
      await loadHomeConfig();
    } catch {
      window.$vmessage.error("保存失败...");
    }
  };

  const syncOssToDb = async () => {
    if (syncing.value || !confirm("确定要全量同步所有 OSS 资源（video / gif / music / photo）到数据库吗？\n（会跳过已存在的记录）")) return;
    syncing.value = true;
    try {
      const res = await syncOssResources(["video", "gif", "music", "photo"]);
      const count = res.data?.insertedCount ?? 0;
      window.$vmessage.success(`同步完成！新增 ${count} 条记录～✞ 月光更亮了哦～`);
    } catch (err) {
      window.$vmessage.error("同步失败...月光好像被乌云遮住了QAQ");
      console.error("同步错误详情:", err.response?.data || err);
    } finally {
      syncing.value = false;
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    uploading.value = true;
    uploadTotal.value = files.length;
    uploadCompleted.value = 0;
    uploadedFiles.value = [];
    for (const file of files) {
      const result = { fileName: file.name, status: "uploading", url: null, error: null };
      uploadedFiles.value.push(result);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await uploadAdminResource(formData);
        result.status = "success";
        result.url = res.data.url;
        window.$vmessage.success(`[${file.name}] 上传成功！已存入 ${res.data.type} 目录～✨`);
      } catch (err) {
        result.status = "error";
        result.error = err.response?.data?.msg || "上传失败";
        window.$vmessage.error(`[${file.name}] ${result.error}`);
      } finally {
        uploadCompleted.value++;
      }
    }
    uploading.value = false;
    event.target.value = "";
  };

  const clearUploadResults = () => { uploadedFiles.value = []; };
  const backToProfile = () => router.push("/profile");

  const fetchResources = async (nextPage = 1) => {
    resourcePage.value = nextPage;
    try {
      const res = await getAdminResources({ page: resourcePage.value, limit: pageSize.value, type: resourceFilter.value.type || undefined });
      resourceList.value = res.data.list || [];
      resourceTotal.value = res.data.total || 0;
    } catch {
      window.$vmessage.error("加载资源失败啦～月光暂时被云遮住了QAQ");
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
      window.$vmessage.success("资源信息已温柔保存到数据库～✞");
    } catch {
      window.$vmessage.error("保存失败啦QAQ…月光抖了一下");
    } finally {
      editingItem.value = null;
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      window.$vmessage.success("SRC 已复制～❤️");
    } catch {
      window.$vmessage.error("复制失败QAQ");
    }
  };

  const onPageSizeChange = () => fetchResources(1);

  onMounted(async () => {
    if (!isOwner(authStore.user)) {
      router.push("/profile");
      window.$vmessage.error("这扇银门只为你一人敞开哦～🖤");
      return;
    }
    await loadHomeConfig();
    await fetchResources(1);
  });

  return {
    syncing, uploading, uploadedFiles, uploadTotal, uploadCompleted, homeConfig, availableFiles,
    saveHomeConfig, setAsMain, syncOssToDb, handleFileUpload, clearUploadResults, backToProfile,
    resourceFilter, resourceList, resourceTotal, resourcePage, totalPages, fetchResources, formatDate,
    editingItem, openEditModal, saveEdit, copyToClipboard, pageSize, onPageSizeChange,
  };
}
