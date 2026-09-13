import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { useAuthStore } from "@/stores/auth";
import { getPublicUser } from "@/modules/user/api/userApi";
import { isOwner } from "@/shared/auth/owner";
import { useUploadQueue } from "@/modules/upload/composables/useUploadQueue";
import { formatBytes } from "@/utils/bytes";
import {
  deleteComment,
  deleteGallery,
  getGalleryComments,
  getGalleryPage,
  getUploadLimit,
  isGalleryLiked,
  likeGallery,
  likeGalleryComment,
  postGalleryComment,
  updateGallery,
  uploadGalleryFile,
} from "@/modules/gallery/api/galleryApi";

// 后端 ID 是 Long，序列化后可能是数字或字符串，统一转成字符串比较
const isSameId = (left, right) => left != null && right != null && String(left) === String(right);

// 发请求的方法，catch 里只做状态回滚，不弹提示：
// 请求失败时 request.js 已经弹过后端返回的 msg，这里再弹一次会出现重复提示。
export function useGalleryPage() {
  const authStore = useAuthStore();
  const page = ref(1);
  const limit = ref(6);
  const total = ref(0);
  const totalPages = computed(() => Math.ceil(total.value / limit.value));
  const galleryList = ref([]);
  const showUploadModal = ref(false);
  // 每个文件一个请求、最多 3 个并发；单文件进度与状态都由队列维护
  const uploadQueue = useUploadQueue(uploadGalleryFile, { maxConcurrent: 3 });
  const uploadLimitText = ref("");
  const currentItem = ref(null);
  const comments = ref([]);
  const newComment = ref("");
  const showUserProfile = ref(false);
  const selectedUser = ref(null);
  const isResizing = ref(false);
  const startY = ref(0);
  const initialDescHeight = ref(0);
  const resizeTarget = ref(null);
  const editingItem = ref(null);
  const savingEdit = ref(false);
  // 待删除目标：{ type: "gallery" | "comment", id, label }
  const deleteTarget = ref(null);
  const deleting = ref(false);

  const isAdmin = computed(() => isOwner(authStore.user));
  const currentUserId = computed(() => authStore.user?.id ?? null);

  // 只有上传者本人或管理员能看到编辑/删除入口：入口隐藏只是显示逻辑，
  // 接口会独立校验越权请求，前端这里不承担权限控制。
  // 列表项的上传者 ID 兼容 uploaderId 与历史字段 userId。
  const canManageItem = (item) => isAdmin.value || isSameId(item?.uploaderId ?? item?.userId, currentUserId.value);
  const canManageComment = (comment) => isAdmin.value || isSameId(comment?.userId, currentUserId.value);

  const normalizeComments = (items) => (items || []).map((comment) => ({
    ...comment,
    isLiked: comment.isLiked || false,
    likeCount: comment.likeCount || comment.likes || 0,
  }));

  const loadGallery = async () => {
    try {
      const res = await getGalleryPage({ page: page.value, limit: limit.value });
      galleryList.value = res.data.list || [];
      total.value = res.data.total || 0;
    } catch {
      // 提示由 request.js 负责
    }
  };

  const loadComments = async (id) => {
    const res = await getGalleryComments(id);
    comments.value = normalizeComments(res.data);
  };

  const likeComment = async (comment) => {
    if (comment.isLiked) return window.$vmessage.info("不能重复点赞");
    try {
      await likeGalleryComment(comment.id);
      await loadComments(currentItem.value.id);
    } catch {
      // 提示由 request.js 负责
    }
  };

  const openUserProfile = async (_userId, username) => {
    try {
      const res = await getPublicUser(username);
      selectedUser.value = res.data || { username };
    } catch {
      selectedUser.value = {
        username,
        avatar: "/default-avatar.gif",
        sex: "SECRET",
        description: "无",
        createdAt: new Date(),
      };
    }
    showUserProfile.value = true;
  };

  const closeDetail = () => {
    currentItem.value = null;
    comments.value = [];
    newComment.value = "";
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages.value) return;
    page.value = nextPage;
    loadGallery();
  };

  const changeLimit = () => {
    page.value = 1;
    loadGallery();
  };

  const clearUploadQueue = () => {
    uploadQueue.items.value.forEach((item) => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    });
    uploadQueue.reset();
  };

  // 大小上限来自后端配置，前端不另写固定值
  const loadUploadLimit = async () => {
    try {
      const res = await getUploadLimit();
      uploadLimitText.value = res.data?.maxFileSizeBytes
        ? `单个文件最大 ${formatBytes(res.data.maxFileSizeBytes)}`
        : "";
    } catch {
      // 提示由 request.js 负责
    }
  };

  const openUploadModal = () => {
    clearUploadQueue();
    showUploadModal.value = true;
    if (!uploadLimitText.value) loadUploadLimit();
  };

  const closeUploadModal = () => {
    if (uploadQueue.hasUnfinished.value && !window.confirm("还有文件在上传，确定关闭吗？")) return;
    clearUploadQueue();
    showUploadModal.value = false;
  };

  // 追加而不是替换：队列模型下用户可以分几次挑文件
  const handleFiles = (event) => {
    Array.from(event.target.files).forEach((file) => {
      uploadQueue.add(file, { preview: URL.createObjectURL(file) });
    });
    event.target.value = "";
  };

  const uploadAll = () => {
    uploadQueue.start();
  };

  // 列表以服务端结果为准：全部跑完后重新拉一次，不用本地的成功推断
  watch(
    () => uploadQueue.hasUnfinished.value,
    (unfinished) => {
      if (!unfinished && uploadQueue.successCount.value > 0) loadGallery();
    },
  );

  const toggleLike = async (item) => {
    if (item.isLiked) return window.$vmessage.info("不能重复点赞");
    const originalLikes = item.likes || 0;
    try {
      if ((await isGalleryLiked(item.id)).data) {
        item.isLiked = true;
        return window.$vmessage.info("不能重复点赞");
      }
      item.isLiked = true;
      item.likes = originalLikes + 1;
      await likeGallery(item.id);
    } catch {
      // 乐观更新回滚；提示由 request.js 负责
      item.isLiked = false;
      item.likes = originalLikes;
    }
  };

  const openDetailModal = async (item) => {
    currentItem.value = { ...item, isLiked: false };
    try {
      await loadComments(item.id);
    } catch {
      comments.value = [];
    }
  };

  const postComment = async () => {
    if (!newComment.value.trim()) return;
    try {
      await postGalleryComment({ target_id: currentItem.value.id, content: newComment.value });
      newComment.value = "";
      await loadComments(currentItem.value.id);
      currentItem.value.commentCount = (currentItem.value.commentCount || 0) + 1;
    } catch {
      // 提示由 request.js 负责
    }
  };

  const openEditModal = (item) => {
    editingItem.value = item;
  };

  const closeEditModal = () => {
    editingItem.value = null;
  };

  // 局部更新列表与详情中对应的那条，不重新拉取整页
  const applyEditedFields = (id, payload) => {
    const apply = (item) => {
      if (item && isSameId(item.id, id)) Object.assign(item, payload);
    };
    apply(currentItem.value);
    apply(galleryList.value.find((item) => isSameId(item.id, id)));
  };

  const submitEdit = async (payload) => {
    const target = editingItem.value;
    if (!target) return;
    if (Object.keys(payload).length === 0) {
      window.$vmessage.info("未修改任何内容");
      closeEditModal();
      return;
    }
    if (payload.title !== undefined && !payload.title.trim()) {
      return window.$vmessage.warning("标题不能为空");
    }
    savingEdit.value = true;
    try {
      await updateGallery(target.id, payload);
      applyEditedFields(target.id, payload);
      window.$vmessage.success("修改成功");
      closeEditModal();
    } catch {
      // 提示由 request.js 负责，失败时不改动已展示的数据
    } finally {
      savingEdit.value = false;
    }
  };

  const requestDeleteItem = (item) => {
    deleteTarget.value = { type: "gallery", id: item.id, label: item.title || "该资源" };
  };

  const requestDeleteComment = (comment) => {
    deleteTarget.value = { type: "comment", id: comment.id, label: `@${comment.username}` };
  };

  const cancelDelete = () => {
    deleteTarget.value = null;
  };

  // 删除父评论时后端会级联删除全部子评论，本地按 parentId 一并移除
  const collectCommentIds = (list, rootId) => {
    const ids = new Set([rootId]);
    let grew = true;
    while (grew) {
      grew = false;
      list.forEach((item) => {
        if (!ids.has(item.id) && ids.has(item.parentId)) {
          ids.add(item.id);
          grew = true;
        }
      });
    }
    return ids;
  };

  const changeCommentCount = (delta) => {
    const adjust = (item) => {
      if (item) item.commentCount = Math.max(0, (item.commentCount || 0) + delta);
    };
    adjust(currentItem.value);
    adjust(galleryList.value.find((item) => isSameId(item.id, currentItem.value?.id)));
  };

  const removeGalleryItem = (id) => {
    const index = galleryList.value.findIndex((item) => isSameId(item.id, id));
    if (index !== -1) {
      galleryList.value.splice(index, 1);
      total.value = Math.max(0, total.value - 1);
    }
    if (isSameId(currentItem.value?.id, id)) closeDetail();
    // 当前页被删空时回退到最后一个有效页补数据，避免留下空白页
    if (galleryList.value.length === 0 && total.value > 0) {
      page.value = Math.min(page.value, Math.max(1, Math.ceil(total.value / limit.value)));
      loadGallery();
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget.value;
    if (!target) return;
    deleting.value = true;
    try {
      if (target.type === "comment") {
        await deleteComment(target.id);
        const removedIds = collectCommentIds(comments.value, target.id);
        comments.value = comments.value.filter((item) => !removedIds.has(item.id));
        changeCommentCount(-removedIds.size);
      } else {
        await deleteGallery(target.id);
        removeGalleryItem(target.id);
      }
      window.$vmessage.success("删除成功");
      deleteTarget.value = null;
    } catch {
      // 提示由 request.js 负责，失败时保留原有数据
    } finally {
      deleting.value = false;
    }
  };

  const displayGender = (sex) => {
    const value = sex?.toString().toLowerCase().trim();
    if (["male", "m"].includes(value)) return "男";
    if (["female", "f"].includes(value)) return "女";
    if (["secret", "s", "other"].includes(value)) return "其他/秘密";
    return "未设置";
  };

  const startResize = (event, target) => {
    event.preventDefault();
    if (!target) return;
    isResizing.value = true;
    resizeTarget.value = target;
    startY.value = event.clientY;
    initialDescHeight.value = target.getBoundingClientRect().height;
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove, { passive: false });
    document.addEventListener("mouseup", stopResize);
  };

  const onMouseMove = (event) => {
    if (!isResizing.value || !resizeTarget.value) return;
    event.preventDefault();
    const height = Math.max(60, Math.min(window.innerHeight * 0.5, initialDescHeight.value + event.clientY - startY.value));
    resizeTarget.value.style.height = `${height}px`;
  };

  const stopResize = () => {
    if (!isResizing.value) return;
    isResizing.value = false;
    resizeTarget.value = null;
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", stopResize);
  };

  const formatDate = (date) => new Date(date).toLocaleString("zh-CN");
  const formatShortDate = (date) => new Date(date).toLocaleDateString("zh-CN");

  onMounted(loadGallery);
  onBeforeUnmount(() => {
    stopResize();
    clearUploadQueue();
  });
  return {
    authStore, page, limit, total, totalPages, galleryList, showUploadModal,
    currentItem, comments, newComment, showUserProfile, selectedUser, likeComment, openUserProfile,
    closeDetail, changePage, changeLimit, openUploadModal, closeUploadModal, handleFiles, uploadAll, toggleLike, openDetailModal,
    postComment, displayGender, startResize, formatDate, formatShortDate,
    isAdmin, canManageItem, canManageComment, editingItem, savingEdit, openEditModal, closeEditModal,
    submitEdit, deleteTarget, deleting, requestDeleteItem, requestDeleteComment, cancelDelete, confirmDelete,
    uploadItems: uploadQueue.items,
    uploadOverallProgress: uploadQueue.overallProgress,
    uploadSuccessCount: uploadQueue.successCount,
    uploadFailedCount: uploadQueue.failedCount,
    uploadHasUnfinished: uploadQueue.hasUnfinished,
    uploadLimitText,
    retryUpload: uploadQueue.retry,
    retryAllFailedUploads: uploadQueue.retryAllFailed,
    cancelUpload: uploadQueue.cancel,
    removeUpload: uploadQueue.remove,
  };
}
